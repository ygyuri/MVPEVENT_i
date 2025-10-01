const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  reminderType: { type: String, enum: ['24h', '2h', '30m'], required: true },
  scheduledTime: { type: Date, required: true },
  deliveryMethod: { type: String, enum: ['email', 'sms', 'both'], default: 'email' },
  status: { type: String, enum: ['pending', 'queued', 'sent', 'failed', 'cancelled'], default: 'pending' },
  deliveredAt: { type: Date },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  timezone: { type: String },
  payload: { type: Map, of: String }
}, {
  timestamps: true
});

reminderSchema.index({ userId: 1, scheduledTime: -1 });
reminderSchema.index({ status: 1, scheduledTime: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);


