const mongoose = require('mongoose');

const eventStaffSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['staff', 'scanner', 'manager'], default: 'staff' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

eventStaffSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventStaffSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('EventStaff', eventStaffSchema);


