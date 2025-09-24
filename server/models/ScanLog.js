const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String },
  result: { type: String, enum: ['success', 'already_used', 'invalid', 'expired', 'denied'], required: true },
  device: {
    userAgent: { type: String },
    platform: { type: String },
    vendor: { type: String }
  }
}, { timestamps: true });

scanLogSchema.index({ eventId: 1, scannedAt: -1 });
scanLogSchema.index({ ticketId: 1, scannedAt: -1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);


