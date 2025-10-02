let Queue, Worker, QueueEvents, IORedis;
try {
  ({ Queue, Worker, QueueEvents } = require('bullmq'));
  IORedis = require('ioredis');
} catch (e) {
  Queue = class { constructor() {} add() { return Promise.resolve(); } getJobCounts() { return Promise.resolve({}); } };
  Worker = class { constructor() {} };
  QueueEvents = class { constructor() {} on() {} };
  IORedis = class {};
}

const presence = require('../../realtime/presence');
const SmsService = require('../smsService');
// Placeholder for web push/FCM; wired later via pushService
const PushService = require('../pushService');

const connectionUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redis;
try { redis = new IORedis(connectionUrl, { maxRetriesPerRequest: null }); } catch (e) { redis = undefined; }

const queueName = 'event-updates';
const updateQueue = new Queue(queueName, { connection: redis });
const updateQueueEvents = new QueueEvents(queueName, { connection: redis });

// Worker: deliver fallback notifications to offline users
const worker = new Worker(queueName, async (job) => {
  const { eventId, updatePayload } = job.data || {};
  if (!eventId || !updatePayload) return;

  const online = await presence.getOnlineUsers(eventId);
  const offlineTargets = (updatePayload.targetUserIds || []).filter(u => !online.includes(String(u)));

  if (offlineTargets.length === 0) return;

  try {
    await PushService.broadcastToUsers(offlineTargets, updatePayload);
  } catch (e) {
    // Best-effort; do not throw unless critical
  }
}, { connection: redis, concurrency: 10 });

if (updateQueueEvents && updateQueueEvents.on) {
  updateQueueEvents.on('failed', ({ jobId, failedReason }) => {
    // eslint-disable-next-line no-console
    console.warn('Update queue job failed', jobId, failedReason);
  });
}

module.exports = { updateQueue };


