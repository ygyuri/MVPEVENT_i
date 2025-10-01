const Reminder = require('../../models/Reminder');
const { enqueueReminder } = require('../queue/reminderQueue');

const SCAN_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function scanAndQueue() {
  const now = new Date();
  const horizon = new Date(now.getTime() + SCAN_INTERVAL_MS);
  const candidates = await Reminder.find({
    status: 'pending',
    scheduledTime: { $lte: horizon }
  }).limit(1000);

  for (const r of candidates) {
    try {
      await enqueueReminder(r._id, r.scheduledTime);
      r.status = 'queued';
      await r.save();
    } catch (e) {
      // Best-effort
    }
  }
}

function startReminderScanner() {
  setInterval(scanAndQueue, SCAN_INTERVAL_MS).unref();
}

module.exports = { startReminderScanner };




