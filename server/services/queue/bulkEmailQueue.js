/**
 * Bulk Email Queue
 * Handles background sending of bulk communications. Uses BullMQ; no send in HTTP.
 * Exponential backoff for failed email attempts.
 */

const redisManager = require("../../config/redis");
const Communication = require("../../models/Communication");
const MessageLog = require("../../models/MessageLog");
const sendingService = require("../communications/sendingService");
const path = require("path");
const fs = require("fs");

const queueName = "bulk-email";
const bulkEmailQueue = redisManager.createQueue(queueName);
const bulkEmailQueueEvents = redisManager.createQueueEvents(queueName);

const redisAvailableAtLoad = redisManager.isRedisAvailable();
console.log(
  "📧 [BULK-EMAIL] Module loaded | redisAvailable:",
  redisAvailableAtLoad,
  "| queue/worker:",
  redisAvailableAtLoad ? "BullMQ (jobs will be processed)" : "FALLBACK (jobs will NOT be processed)"
);
if (!redisAvailableAtLoad) {
  console.warn(
    "📧 [BULK-EMAIL] Worker in FALLBACK mode. Set REDIS_URL and ensure Redis is running, or use sync send (runs when Redis is down)."
  );
}

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

/** Delay between each recipient to avoid SMTP provider 429 rate limit (e.g. Gmail, Ethereal). */
const DELAY_BETWEEN_RECIPIENTS_MS = Math.max(
  0,
  parseInt(process.env.BULK_EMAIL_DELAY_MS || "500", 10)
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const worker = redisManager.createWorker(
  queueName,
  async (job) => {
    const { communicationId } = job.data || {};
    if (!communicationId) throw new Error("Missing communicationId in job data");

    console.log("📧 [BULK-EMAIL] Worker processing job, communicationId:", communicationId);

    const comm = await Communication.findById(communicationId);
    if (!comm) throw new Error(`Communication ${communicationId} not found`);
    if (comm.status !== "queued" && comm.status !== "sending") {
      return { skipped: true, reason: comm.status };
    }

    comm.status = "sending";
    comm.startedAt = new Date();
    await comm.save();

    const pending = await MessageLog.find({
      communicationId: comm._id,
      status: "pending",
    })
      .sort({ createdAt: 1 })
      .lean();

    const total = pending.length;
    let sent = 0;
    let failed = 0;
    const rawAttachments = comm.attachments || [];
    const attachments = rawAttachments.filter((a) => {
      const p = path.isAbsolute(a.path) ? a.path : path.join(process.cwd(), a.path);
      return fs.existsSync(p);
    });
    if (rawAttachments.length > 0) {
      console.log("📎 [BULK-EMAIL] Attachments for communicationId:", communicationId, "| total refs:", rawAttachments.length, "| resolved (file exists):", attachments.length);
      rawAttachments.forEach((a, i) => {
        const p = path.isAbsolute(a.path) ? a.path : path.join(process.cwd(), a.path);
        console.log("📎 [BULK-EMAIL]   attachment", i + 1, "| filename:", a.filename, "| path:", a.path, "| exists:", fs.existsSync(p), "| resolved:", p);
      });
    }
    const rawInlineImages = comm.inlineImages || [];
    const inlineImages = rawInlineImages.filter((a) => {
      const p = path.isAbsolute(a.path) ? a.path : path.join(process.cwd(), a.path);
      return fs.existsSync(p);
    });
    if (rawInlineImages.length > 0) {
      console.log("📎 [BULK-EMAIL] Inline images (posters) for communicationId:", communicationId, "| refs:", rawInlineImages.length, "| resolved:", inlineImages.length);
    }

    for (let i = 0; i < pending.length; i++) {
      const log = pending[i];
      let lastError = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await sendingService.send({
            to: log.recipientEmail,
            subject: comm.subject,
            bodyHtml: comm.bodyHtml,
            attachments,
            inlineImages,
            provider: "email",
            recipientName: log.recipientName,
            recipientEmail: log.recipientEmail,
          });
          await MessageLog.updateOne(
            { _id: log._id },
            {
              $set: {
                status: "sent",
                sentAt: new Date(),
                attempts: attempt + 1,
              },
              $unset: { errorMessage: 1 },
            }
          );
          sent++;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          await MessageLog.updateOne(
            { _id: log._id },
            { $set: { attempts: attempt + 1, errorMessage: err.message } }
          );
          if (attempt < MAX_RETRIES) {
            await sleep(BACKOFF_MS[attempt] || 4000);
          }
        }
      }
      if (lastError) {
        await MessageLog.updateOne(
          { _id: log._id },
          {
            $set: {
              status: "failed",
              errorMessage: lastError.message,
            },
          }
        );
        failed++;
      }

      const pct = total ? Math.round(((i + 1) / total) * 100) : 0;
      job.updateProgress(pct);

      if (DELAY_BETWEEN_RECIPIENTS_MS > 0 && i < pending.length - 1) {
        await sleep(DELAY_BETWEEN_RECIPIENTS_MS);
      }
    }

    comm.status = "completed";
    comm.completedAt = new Date();
    await comm.save();

    console.log("📧 [BULK-EMAIL] Job completed, communicationId:", communicationId, "sent:", sent, "failed:", failed);
    return { total, sent, failed };
  },
  {
    concurrency: 1,
    settings: {
      backoffStrategies: {
        expo: (attemptsMade) => Math.min(8000, 1000 * Math.pow(2, attemptsMade - 1)),
      },
    },
  }
);

async function enqueueBulkEmail(communicationId) {
  const redisAvailable = redisManager.isRedisAvailable();
  console.log(
    "📧 [BULK-EMAIL] enqueueBulkEmail called | communicationId:",
    communicationId,
    "| redisAvailable:",
    redisAvailable
  );
  if (!redisAvailable) {
    console.warn("📧 [BULK-EMAIL] Enqueue skipped - Redis not connected. Jobs will not be processed.");
    throw new Error(
      "Bulk email requires Redis. Redis is not connected. Set REDIS_URL and ensure Redis is running, then try again."
    );
  }
  const opts = {
    jobId: String(communicationId),
    attempts: 1,
    removeOnComplete: { age: 24 * 3600, count: 100 },
    removeOnFail: { age: 7 * 24 * 3600 },
  };
  if (bulkEmailQueue && bulkEmailQueue.add) {
    const job = await bulkEmailQueue.add("send", { communicationId }, opts);
    console.log("📧 [BULK-EMAIL] Job enqueued (BullMQ):", job.id, "communicationId:", communicationId);
    return job.id;
  }
  console.warn("📧 [BULK-EMAIL] No queue available - Redis connection may be down");
  throw new Error("Bulk email queue not available - Redis connection may be down");
}

function isQueueReady() {
  return !!(bulkEmailQueue && bulkEmailQueue.add);
}

module.exports = {
  bulkEmailQueue,
  worker,
  bulkEmailQueueEvents,
  enqueueBulkEmail,
  isQueueReady,
};
