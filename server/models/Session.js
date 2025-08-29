const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index for automatic cleanup
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  userAgent: String,
  ipAddress: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Additional indexes for performance (sessionToken and refreshToken already indexed by unique: true)
sessionSchema.index({ userId: 1, isActive: 1 });

// Clean up expired sessions
sessionSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Update last used timestamp
sessionSchema.methods.updateLastUsed = function() {
  this.lastUsedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);
