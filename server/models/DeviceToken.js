const mongoose = require('mongoose');

/**
 * Device Token Schema
 * Stores FCM device tokens for push notifications
 */
const deviceTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  platform: { 
    type: String, 
    enum: ['android', 'ios', 'web'], 
    required: true 
  },
  deviceInfo: {
    model: String,
    os: String,
    version: String,
    appVersion: String
  },
  isActive: { 
    type: Boolean, 
    default: true, 
    index: true 
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for performance
deviceTokenSchema.index({ userId: 1, isActive: 1 });
deviceTokenSchema.index({ platform: 1, isActive: 1 });
deviceTokenSchema.index({ lastUsed: -1 });

// Update lastUsed on save
deviceTokenSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('token') || this.isNew) {
    this.lastUsed = new Date();
  }
  next();
});

// Static methods
deviceTokenSchema.statics.findActiveTokensByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ lastUsed: -1 });
};

deviceTokenSchema.statics.findActiveTokensByPlatform = function(platform) {
  return this.find({ platform, isActive: true }).sort({ lastUsed: -1 });
};

deviceTokenSchema.statics.deactivateToken = function(token) {
  return this.updateOne({ token }, { isActive: false, updatedAt: new Date() });
};

deviceTokenSchema.statics.deactivateUserTokens = function(userId) {
  return this.updateMany({ userId }, { isActive: false, updatedAt: new Date() });
};

deviceTokenSchema.statics.cleanupInactiveTokens = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    isActive: false, 
    updatedAt: { $lt: cutoffDate } 
  });
};

// Instance methods
deviceTokenSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

deviceTokenSchema.methods.deactivate = function() {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

// Virtual for age
deviceTokenSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for days since last used
deviceTokenSchema.virtual('daysSinceLastUsed').get(function() {
  return Math.floor((Date.now() - this.lastUsed.getTime()) / (1000 * 60 * 60 * 24));
});

// JSON transform
deviceTokenSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);