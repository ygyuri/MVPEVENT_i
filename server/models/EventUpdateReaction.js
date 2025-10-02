const mongoose = require('mongoose');

const eventUpdateReactionSchema = new mongoose.Schema({
  updateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventUpdate', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reactionType: { type: String, enum: ['like', 'love', 'clap', 'wow', 'sad'], required: true }
}, { timestamps: true });

eventUpdateReactionSchema.index({ updateId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('EventUpdateReaction', eventUpdateReactionSchema);


