/**
 * Bulk Resend Queue
 *
 * Handles background processing of bulk ticket resend operations.
 * Uses BullMQ for job processing and emits real-time progress via Socket.io.
 *
 * @module bulkResendQueue
 */

const redisManager = require('../../config/redis');
const bulkResendService = require('../bulkResendService');
const BulkResendLog = require('../../models/BulkResendLog');
const notificationService = require('../notificationService');

const queueName = 'bulk-resend';
const bulkResendQueue = redisManager.createQueue(queueName);
const bulkResendQueueEvents = redisManager.createQueueEvents(queueName);

/**
 * Get Socket.io instance for emitting progress updates
 * This function is defined after Socket.io is initialized
 */
let getIO = null;
function setSocketIO(ioGetter) {
  getIO = ioGetter;
}

/**
 * Worker processor for bulk resend jobs
 * Concurrency: 2 (limit concurrent bulk operations to avoid overload)
 */
const worker = redisManager.createWorker(queueName, async (job) => {
  const { auditLogId, filters } = job.data || {};

  if (!auditLogId) {
    throw new Error('Missing auditLogId in job data');
  }

  // Load audit log
  const auditLog = await BulkResendLog.findById(auditLogId);
  if (!auditLog) {
    throw new Error(`Audit log ${auditLogId} not found`);
  }

  // Update status to in_progress
  auditLog.status = 'in_progress';
  await auditLog.save();

  try {
    // Progress callback for real-time updates
    const progressCallback = (progressData) => {
      // Update job progress (0-100)
      const percentage = (progressData.progress.current / progressData.progress.total) * 100;
      job.updateProgress(Math.round(percentage));

      // Emit Socket.io event to room
      if (getIO && typeof getIO === 'function') {
        const io = getIO();
        if (io) {
          io.to(`bulk-resend:${auditLogId}`).emit('bulk-resend:progress', {
            jobId: auditLogId,
            ...progressData,
          });
        }
      }

      // Update audit log with current progress
      auditLog.stats = {
        totalOrdersFound: progressData.stats.totalOrdersFound || 0,
        totalOrdersProcessed: progressData.stats.ordersProcessed || 0,
        totalOrdersSkipped: progressData.stats.ordersSkipped || 0,
        totalTicketsUpdated: progressData.stats.ticketsUpdated || 0,
        totalEmailsSent: progressData.stats.emailsSent || 0,
        totalEmailRetries: progressData.stats.emailRetries || 0,
        totalErrors: progressData.stats.errors || 0,
      };
      auditLog.save().catch(err => console.error('Failed to update audit log progress:', err));
    };

    // Execute bulk resend with progress callback
    const stats = await bulkResendService.resendTicketsForOrders({
      ...filters,
      progressCallback,
    });

    // Update audit log with final results
    auditLog.status = 'completed';
    auditLog.endTime = new Date();
    auditLog.stats = {
      totalOrdersFound: stats.totalOrdersFound,
      totalOrdersProcessed: stats.totalOrdersProcessed,
      totalOrdersSkipped: stats.totalOrdersSkipped,
      totalTicketsUpdated: stats.totalTicketsUpdated,
      totalEmailsSent: stats.totalEmailsSent,
      totalEmailRetries: stats.totalEmailRetries,
      totalErrors: stats.totalErrors,
    };
    auditLog.errors = stats.errors || [];
    await auditLog.save();

    // Send admin notification
    try {
      await notificationService.sendBulkResendNotification(auditLogId);
      console.log(`✅ Admin notification sent for job ${auditLogId}`);
    } catch (notifErr) {
      console.error(`⚠️  Failed to send admin notification for job ${auditLogId}:`, notifErr.message);
      // Don't fail the job if notification fails
    }

    // Emit completion event
    if (getIO && typeof getIO === 'function') {
      const io = getIO();
      if (io) {
        io.to(`bulk-resend:${auditLogId}`).emit('bulk-resend:completed', {
          jobId: auditLogId,
          stats,
        });
      }
    }

    return { success: true, stats };
  } catch (err) {
    // Update audit log with failure
    auditLog.status = 'failed';
    auditLog.endTime = new Date();
    auditLog.error = err.message;
    await auditLog.save();

    // Send admin notification for failure
    try {
      await notificationService.sendBulkResendNotification(auditLogId);
      console.log(`✅ Admin notification sent for failed job ${auditLogId}`);
    } catch (notifErr) {
      console.error(`⚠️  Failed to send admin notification for failed job ${auditLogId}:`, notifErr.message);
      // Don't fail the job further if notification fails
    }

    // Emit failure event
    if (getIO && typeof getIO === 'function') {
      const io = getIO();
      if (io) {
        io.to(`bulk-resend:${auditLogId}`).emit('bulk-resend:failed', {
          jobId: auditLogId,
          error: err.message,
        });
      }
    }

    throw err;
  }
}, {
  concurrency: 2, // Limit concurrent bulk operations
  settings: {
    backoffStrategies: {
      // Exponential backoff: 1s, 2s, 4s
      expo: (attemptsMade) => Math.min(4000, 1000 * Math.pow(2, attemptsMade - 1))
    }
  }
});

// Event listeners
if (bulkResendQueueEvents && bulkResendQueueEvents.on) {
  bulkResendQueueEvents.on('failed', ({ jobId, failedReason }) => {
    try {
      console.error(`❌ Bulk resend job ${jobId} failed:`, failedReason);
    } catch {}
  });

  bulkResendQueueEvents.on('completed', ({ jobId }) => {
    try {
      console.log(`✅ Bulk resend job ${jobId} completed successfully`);
    } catch {}
  });

  bulkResendQueueEvents.on('progress', ({ jobId, data }) => {
    try {
      console.log(`📊 Bulk resend job ${jobId} progress: ${data}%`);
    } catch {}
  });
}

/**
 * Enqueue a bulk resend job
 *
 * @param {string} auditLogId - Audit log ID for tracking
 * @param {Object} filters - Filters for bulk resend (eventId, startDate, endDate, etc.)
 * @returns {Promise<string>} Job ID
 */
async function enqueueBulkResend(auditLogId, filters) {
  const opts = {
    jobId: String(auditLogId), // Use audit log ID as job ID
    attempts: 3, // Retry up to 3 times on failure
    backoff: { type: 'exponential' },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  };

  if (bulkResendQueue && bulkResendQueue.add) {
    const job = await bulkResendQueue.add('process', { auditLogId, filters }, opts);
    console.log(`📋 Bulk resend job enqueued: ${job.id}`);
    return job.id;
  } else {
    throw new Error('Bulk resend queue not available - Redis connection may be down');
  }
}

/**
 * Check if queue is ready
 *
 * @returns {boolean} True if queue is available
 */
function isQueueReady() {
  return !!(bulkResendQueue && bulkResendQueue.add);
}

module.exports = {
  bulkResendQueue,
  worker,
  bulkResendQueueEvents,
  enqueueBulkResend,
  isQueueReady,
  setSocketIO,
};
