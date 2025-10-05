const redisManager = require('../../config/redis');
const presence = require('../../realtime/presence');
const SmsService = require('../smsService');
// Placeholder for web push/FCM; wired later via pushService
const PushService = require('../pushService');

const queueName = 'event-updates';
const updateQueue = redisManager.createQueue(queueName);
const updateQueueEvents = redisManager.createQueueEvents(queueName);

// Worker: deliver fallback notifications to offline users
const worker = redisManager.createWorker(queueName, async (job) => {
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
}, { concurrency: 10 });

if (updateQueueEvents && updateQueueEvents.on) {
  updateQueueEvents.on('failed', ({ jobId, failedReason }) => {
    // eslint-disable-next-line no-console
    console.warn('Update queue job failed', jobId, failedReason);
  });
}

module.exports = { updateQueue };


