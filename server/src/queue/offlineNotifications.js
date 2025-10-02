const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const PushNotificationService = require('../services/pushNotification');
const presence = require('../../realtime/presence');

/**
 * Offline Notifications Queue
 * Handles delivery of updates to offline users
 */
class OfflineNotificationsQueue {
  constructor() {
    this.redis = null;
    this.queue = null;
    this.worker = null;
    this.queueEvents = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the queue system
   */
  async initialize() {
    try {
      console.log('🔄 Initializing offline notifications queue...');

      // Setup Redis connection
      this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableReadyCheck: false
      });

      // Create queue
      this.queue = new Queue('offline-notifications', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      // Create worker
      this.worker = new Worker('offline-notifications', this.processJob.bind(this), {
        connection: this.redis,
        concurrency: 10
      });

      // Setup queue events
      this.queueEvents = new QueueEvents('offline-notifications', {
        connection: this.redis
      });

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Offline notifications queue initialized');

    } catch (error) {
      console.error('❌ Failed to initialize offline notifications queue:', error);
      throw error;
    }
  }

  /**
   * Process a job from the queue
   */
  async processJob(job) {
    const { eventId, updatePayload, targetUserIds } = job.data;

    try {
      console.log(`📦 Processing offline notification job for event ${eventId}`);

      // Get online users for this event
      const onlineUsers = await presence.getOnlineUsers(eventId);
      const onlineUserIds = onlineUsers.map(user => String(user.user_id));

      // Filter out online users
      const offlineTargets = targetUserIds.filter(userId => 
        !onlineUserIds.includes(String(userId))
      );

      if (offlineTargets.length === 0) {
        console.log('📱 No offline users to notify');
        return { success: true, message: 'No offline users' };
      }

      // Send push notifications
      const result = await PushNotificationService.sendToUsers(offlineTargets, {
        title: `🔔 New Update`,
        body: updatePayload.content.substring(0, 100) + '...',
        data: {
          event_id: eventId,
          update_id: updatePayload.id,
          type: 'event_update',
          priority: updatePayload.priority
        },
        priority: updatePayload.priority === 'urgent' ? 'high' : 'normal'
      });

      console.log(`📱 Sent notifications to ${result.success} offline users`);
      return result;

    } catch (error) {
      console.error('❌ Failed to process offline notification job:', error);
      throw error;
    }
  }

  /**
   * Add a job to the queue
   */
  async addNotificationJob(eventId, updatePayload, targetUserIds) {
    if (!this.isInitialized) {
      console.warn('⚠️ Queue not initialized, skipping offline notification');
      return;
    }

    try {
      const job = await this.queue.add('deliver-offline', {
        eventId,
        updatePayload,
        targetUserIds
      }, {
        delay: 5000, // 5 second delay to allow for real-time delivery first
        priority: updatePayload.priority === 'urgent' ? 1 : 5
      });

      console.log(`📤 Added offline notification job ${job.id} for event ${eventId}`);
      return job;

    } catch (error) {
      console.error('❌ Failed to add offline notification job:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Worker events
    this.worker.on('completed', (job) => {
      console.log(`✅ Offline notification job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Offline notification job ${job.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker error:', err);
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ Job ${jobId} waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      console.log(`🔄 Job ${jobId} active`);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`✅ Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed:`, failedReason);
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const counts = await this.queue.getJobCounts();
      return {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup() {
    if (!this.isInitialized) return;

    try {
      // Remove completed jobs older than 24 hours
      await this.queue.clean(24 * 60 * 60 * 1000, 100, 'completed');
      
      // Remove failed jobs older than 7 days
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
      
      console.log('🧹 Queue cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup queue:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down offline notifications queue...');

    if (this.worker) {
      await this.worker.close();
    }

    if (this.queue) {
      await this.queue.close();
    }

    if (this.redis) {
      await this.redis.disconnect();
    }

    console.log('✅ Offline notifications queue shutdown complete');
  }
}

// Create singleton instance
const offlineNotificationsQueue = new OfflineNotificationsQueue();

/**
 * Utility functions for adding jobs
 */
async function addOfflineNotification(eventId, updatePayload, targetUserIds) {
  return await offlineNotificationsQueue.addNotificationJob(eventId, updatePayload, targetUserIds);
}

async function getQueueStats() {
  return await offlineNotificationsQueue.getStats();
}

async function cleanupQueue() {
  return await offlineNotificationsQueue.cleanup();
}

module.exports = {
  offlineNotificationsQueue,
  addOfflineNotification,
  getQueueStats,
  cleanupQueue
};
