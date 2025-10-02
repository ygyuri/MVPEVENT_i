const mongoose = require('mongoose');

const eventUpdateSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  mediaUrls: [{ type: String }],
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal', index: true },
  moderation: {
    status: { type: String, enum: ['pending', 'approved', 'flagged'], default: 'pending', index: true },
    flags: [{ type: String }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date }
  },
  editedAt: { type: Date },
  deletedAt: { type: Date }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

eventUpdateSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('EventUpdate', eventUpdateSchema);


