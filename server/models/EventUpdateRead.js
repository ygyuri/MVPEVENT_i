const mongoose = require('mongoose');

const eventUpdateReadSchema = new mongoose.Schema({
  updateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventUpdate', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  readAt: { type: Date, default: Date.now }
}, { timestamps: true });

eventUpdateReadSchema.index({ updateId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('EventUpdateRead', eventUpdateReadSchema);


