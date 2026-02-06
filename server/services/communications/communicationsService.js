/**
 * Communications service: drafts, build recipients from ticket IDs, enqueue send.
 * Does NOT send emails; worker does that.
 */

const path = require("path");
const fs = require("fs");
const Communication = require("../../models/Communication");
const MessageLog = require("../../models/MessageLog");
const Ticket = require("../../models/Ticket");
const sendingService = require("./sendingService");
// Lazy require so bulkEmailQueue loads AFTER Redis connects (when first send runs)

const SYNC_RETRIES = 3;
const SYNC_BACKOFF_MS = [1000, 2000, 4000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE_MB = 10;
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Create or update a draft.
 * @param {Object} opts - { createdBy, subject, bodyHtml, eventId, recipientType, recipientIds, attachmentIds?, id? }
 * @returns {Promise<Communication>}
 */
async function saveDraft(opts) {
  const {
    createdBy,
    subject = "",
    bodyHtml = "",
    eventId = null,
    recipientType = "attendees",
    recipientIds = [],
    attachments = [],
    inlineImages = [],
    id,
  } = opts;

  if (id) {
    const comm = await Communication.findOne({ _id: id, createdBy, status: "draft" });
    if (!comm) return null;
    comm.subject = subject;
    comm.bodyHtml = bodyHtml;
    comm.eventId = eventId || undefined;
    comm.recipientType = recipientType;
    comm.recipientIds = recipientIds;
    comm.attachments = attachments;
    comm.inlineImages = Array.isArray(inlineImages) ? inlineImages : [];
    await comm.save();
    return comm;
  }

  const comm = new Communication({
    createdBy,
    subject,
    bodyHtml,
    eventId,
    recipientType,
    recipientIds,
    recipientRefModel: "Ticket",
    attachments,
    inlineImages: Array.isArray(inlineImages) ? inlineImages : [],
    status: "draft",
  });
  await comm.save();
  return comm;
}

/**
 * List drafts for a user.
 * @param {string} userId
 * @param {Object} pagination - { page, limit }
 * @returns {Promise<{ drafts, pagination }>}
 */
async function listDrafts(userId, pagination = {}) {
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(50, Math.max(1, pagination.limit || 20));
  const skip = (page - 1) * limit;

  const [drafts, total] = await Promise.all([
    Communication.find({ createdBy: userId, status: "draft" })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Communication.countDocuments({ createdBy: userId, status: "draft" }),
  ]);

  return {
    drafts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get one Communication by id (must be createdBy user or admin).
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<Communication|null>}
 */
async function getCommunication(id, userId) {
  return Communication.findOne({ _id: id, createdBy: userId }).lean();
}

/**
 * Build unique recipients (email + name) from ticket IDs; dedupe by email.
 * @param {ObjectId[]} ticketIds
 * @returns {Promise<Array<{ email, name, ticketId }>>}
 */
async function buildRecipientsFromTicketIds(ticketIds) {
  if (!ticketIds || ticketIds.length === 0) return [];
  const tickets = await Ticket.find({ _id: { $in: ticketIds } })
    .select("_id holder.email holder.firstName holder.lastName")
    .lean();
  const byEmail = new Map();
  for (const t of tickets) {
    const email = (t.holder && t.holder.email) ? t.holder.email.trim().toLowerCase() : null;
    if (!email) continue;
    const name = [t.holder?.firstName, t.holder?.lastName].filter(Boolean).join(" ") || email;
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, name, ticketId: t._id });
    }
  }
  return Array.from(byEmail.values());
}

/**
 * Prepare send: update Communication to queued, create MessageLog (pending), enqueue job.
 * Does NOT send in request; worker sends.
 * @param {string} communicationId
 * @param {string} userId
 * @returns {Promise<{ communication, jobId }>}
 */
async function prepareAndEnqueueSend(communicationId, userId) {
  const comm = await Communication.findOne({ _id: communicationId, createdBy: userId });
  if (!comm) return null;
  if (comm.status !== "draft") {
    throw new Error("Communication is not a draft");
  }

  const recipients = await buildRecipientsFromTicketIds(comm.recipientIds);
  if (recipients.length === 0) {
    throw new Error("No valid recipients");
  }

  const logDocs = recipients.map((r) => ({
    insertOne: {
      document: {
        communicationId: comm._id,
        recipientEmail: r.email,
        recipientName: r.name,
        recipientRef: r.ticketId,
        recipientRefModel: "Ticket",
        status: "pending",
        attempts: 0,
      },
    },
  }));

  await MessageLog.bulkWrite(logDocs);

  comm.status = "queued";
  comm.queuedAt = new Date();
  await comm.save();

  console.log("📧 [COMMS] prepareAndEnqueueSend | communicationId:", communicationId, "| creating MessageLogs and enqueueing");
  const { enqueueBulkEmail } = require("../queue/bulkEmailQueue");

  try {
    const jobId = await enqueueBulkEmail(communicationId);
    comm.jobId = jobId;
    await comm.save();
    return { communication: comm, jobId };
  } catch (err) {
    if (err.message && err.message.includes("Redis")) {
      console.warn("📧 [COMMS] Redis unavailable, running bulk send synchronously | communicationId:", communicationId);
      await runBulkSendSync(communicationId, userId);
      console.log("📧 [COMMS] Sync send finished | communicationId:", communicationId);
      return { communication: comm, jobId: null, sync: true };
    }
    throw err;
  }
}

/**
 * Run bulk send in-process (same logic as queue worker). Used when Redis is unavailable.
 * @param {string} communicationId
 * @param {string} userId
 * @returns {Promise<{ total, sent, failed }>}
 */
async function runBulkSendSync(communicationId, userId) {
  const comm = await Communication.findOne({ _id: communicationId, createdBy: userId });
  if (!comm) throw new Error("Communication not found");
  if (comm.status !== "queued" && comm.status !== "sending") {
    return { total: 0, sent: 0, failed: 0, skipped: true };
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
    console.log("📎 [COMMS] Sync send attachments | communicationId:", communicationId, "| total refs:", rawAttachments.length, "| resolved (file exists):", attachments.length);
    rawAttachments.forEach((a, i) => {
      const p = path.isAbsolute(a.path) ? a.path : path.join(process.cwd(), a.path);
      console.log("📎 [COMMS]   attachment", i + 1, "| filename:", a.filename, "| path:", a.path, "| exists:", fs.existsSync(p));
    });
  }
  const rawInlineImages = comm.inlineImages || [];
  const inlineImages = rawInlineImages.filter((a) => {
    const p = path.isAbsolute(a.path) ? a.path : path.join(process.cwd(), a.path);
    return fs.existsSync(p);
  });
  if (rawInlineImages.length > 0) {
    console.log("📎 [COMMS] Sync send inline images (posters) | communicationId:", communicationId, "| refs:", rawInlineImages.length, "| resolved:", inlineImages.length);
  }

  for (let i = 0; i < pending.length; i++) {
    const log = pending[i];
    let lastError = null;
    for (let attempt = 0; attempt <= SYNC_RETRIES; attempt++) {
      try {
        await sendingService.send({
          to: log.recipientEmail,
          subject: comm.subject,
          bodyHtml: comm.bodyHtml,
          attachments,
          inlineImages,
          provider: "email",
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
        if (attempt < SYNC_RETRIES) {
          await sleep(SYNC_BACKOFF_MS[attempt] || 4000);
        }
      }
    }
    if (lastError) {
      await MessageLog.updateOne(
        { _id: log._id },
        { $set: { status: "failed", errorMessage: lastError.message } }
      );
      failed++;
    }
  }

  comm.status = "completed";
  comm.completedAt = new Date();
  await comm.save();

  console.log("📧 [COMMS] Sync send completed, communicationId:", communicationId, "sent:", sent, "failed:", failed);
  return { total, sent, failed };
}

/**
 * Get send status: aggregate MessageLog by communicationId.
 * @param {string} communicationId
 * @param {string} userId
 * @returns {Promise<{ total, sent, failed, pending, errors }|null>}
 */
async function getStatus(communicationId, userId) {
  const comm = await Communication.findOne({ _id: communicationId, createdBy: userId }).lean();
  if (!comm) return null;

  const stats = await MessageLog.aggregate([
    { $match: { communicationId: comm._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const total = stats.reduce((s, x) => s + x.count, 0);
  const sent = (stats.find((x) => x._id === "sent") || {}).count || 0;
  const failed = (stats.find((x) => x._id === "failed") || {}).count || 0;
  const pending = (stats.find((x) => x._id === "pending") || {}).count || 0;

  const errors = await MessageLog.find(
    { communicationId: comm._id, status: "failed" }
  )
    .select("recipientEmail errorMessage")
    .limit(20)
    .lean();

  return {
    communicationId: comm._id,
    status: comm.status,
    total,
    sent,
    failed,
    pending,
    errors: errors.map((e) => ({ email: e.recipientEmail, errorMessage: e.errorMessage })),
  };
}

/**
 * Validate attachment: size and MIME.
 * @param {Object} file - multer file
 * @returns {boolean}
 */
function validateAttachment(file) {
  if (!file || !file.path) return false;
  const sizeMB = (file.size || 0) / (1024 * 1024);
  if (sizeMB > MAX_ATTACHMENT_SIZE_MB) return false;
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_MIME.length && !ALLOWED_MIME.includes(mime)) return false;
  return true;
}

module.exports = {
  saveDraft,
  listDrafts,
  getCommunication,
  buildRecipientsFromTicketIds,
  prepareAndEnqueueSend,
  runBulkSendSync,
  getStatus,
  validateAttachment,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_MB,
  ALLOWED_MIME,
};
