const redisManager = require('../../config/redis');
const Reminder = require('../../models/Reminder');
const EmailService = require('../emailService');
const SmsService = require('../smsService');
const path = require('path');

const queueName = 'reminders';
const reminderQueue = redisManager.createQueue(queueName);
const reminderQueueEvents = redisManager.createQueueEvents(queueName);

// Worker processor
const worker = redisManager.createWorker(queueName, async (job) => {
  const { reminderId } = job.data || {};
  if (!reminderId) return;
  const reminder = await Reminder.findById(reminderId)
    .populate('eventId')
    .populate('userId');

  if (!reminder || reminder.status === 'cancelled') {
    return;
  }

  try {
    // Delivery
    const method = reminder.deliveryMethod || 'email';
    if (method === 'email' || method === 'both') {
      const to = reminder.payload?.get('email') || reminder.userId?.email;
      if (to) {
        const subject = reminder.payload?.get('subject') || `Reminder: ${reminder.eventId?.title || 'Event'}`;
        const html = reminder.payload?.get('html') || `<p>Your event starts soon.</p>`;
        await EmailService.transporter.sendMail({
          from: `"Event-i" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html
        });
      }
    }
    if (method === 'sms' || method === 'both') {
      const phone = reminder.payload?.get('phone') || reminder.userId?.profile?.phone;
      const text = reminder.payload?.get('text') || `Reminder: ${reminder.eventId?.title || 'Event'} starts soon`;
      if (phone) {
        try {
          await SmsService.sendSms(phone, text);
        } catch (smsErr) {
          // Do not fail email if SMS fails when method is both; if only sms, throw
          if (method === 'sms') throw smsErr;
        }
      }
    }

    reminder.status = 'sent';
    reminder.deliveredAt = new Date();
    await reminder.save();
  } catch (err) {
    reminder.status = 'failed';
    reminder.attempts = (reminder.attempts || 0) + 1;
    reminder.lastError = err?.message;
    await reminder.save();
    throw err;
  }
}, {
  concurrency: 10,
  settings: {
    backoffStrategies: {
      expo: (attemptsMade) => Math.min(60000, 500 * Math.pow(2, attemptsMade - 1))
    }
  }
});

if (reminderQueueEvents && reminderQueueEvents.on) {
  reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
    try { console.warn(`Reminder job ${jobId} failed:`, failedReason); } catch {}
  });
}

async function enqueueReminder(reminderId, runAt) {
  const opts = {
    jobId: String(reminderId),
    delay: Math.max(0, new Date(runAt).getTime() - Date.now()),
    attempts: 5,
    backoff: { type: 'exponential' }
  };
  if (reminderQueue && reminderQueue.add) {
    await reminderQueue.add('deliver', { reminderId }, opts);
  }
}

module.exports = {
  reminderQueue,
  worker,
  reminderQueueEvents,
  enqueueReminder
};


