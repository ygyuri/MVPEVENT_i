const mongoose = require('mongoose');

const reminderTemplateSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  name: { type: String, required: true, trim: true },
  channel: { type: String, enum: ['email', 'sms'], required: true },
  messageContent: { type: String, required: true },
  variables: [{ type: String }],
  isDefault: { type: Boolean, default: false }
}, {
  timestamps: true
});

reminderTemplateSchema.index({ eventId: 1, channel: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ReminderTemplate', reminderTemplateSchema);




