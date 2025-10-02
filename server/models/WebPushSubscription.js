const mongoose = require('mongoose');

/**
 * Web Push Subscription Schema
 * Stores Web Push API subscriptions for browser notifications
 */
const webPushSubscriptionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  subscription: {
    endpoint: { 
      type: String, 
      required: true,
      index: true 
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  userAgent: { 
    type: String,
    index: true 
  },
  browser: {
    name: String,
    version: String
  },
  os: {
    name: String,
    version: String
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
webPushSubscriptionSchema.index({ userId: 1, isActive: 1 });
webPushSubscriptionSchema.index({ 'subscription.endpoint': 1 });
webPushSubscriptionSchema.index({ lastUsed: -1 });
webPushSubscriptionSchema.index({ browser: 1, os: 1 });

// Update lastUsed on save
webPushSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('subscription') || this.isNew) {
    this.lastUsed = new Date();
  }
  next();
});

// Static methods
webPushSubscriptionSchema.statics.findActiveSubscriptionsByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ lastUsed: -1 });
};

webPushSubscriptionSchema.statics.findActiveSubscriptionsByBrowser = function(browser) {
  return this.find({ 'browser.name': browser, isActive: true }).sort({ lastUsed: -1 });
};

webPushSubscriptionSchema.statics.deactivateSubscription = function(endpoint) {
  return this.updateOne(
    { 'subscription.endpoint': endpoint }, 
    { isActive: false, updatedAt: new Date() }
  );
};

webPushSubscriptionSchema.statics.deactivateUserSubscriptions = function(userId) {
  return this.updateMany({ userId }, { isActive: false, updatedAt: new Date() });
};

webPushSubscriptionSchema.statics.cleanupInactiveSubscriptions = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    isActive: false, 
    updatedAt: { $lt: cutoffDate } 
  });
};

webPushSubscriptionSchema.statics.findByEndpoint = function(endpoint) {
  return this.findOne({ 'subscription.endpoint': endpoint });
};

// Instance methods
webPushSubscriptionSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

webPushSubscriptionSchema.methods.deactivate = function() {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

webPushSubscriptionSchema.methods.updateUserAgent = function(userAgent) {
  this.userAgent = userAgent;
  this.updatedAt = new Date();
  return this.save();
};

// Virtual for age
webPushSubscriptionSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for days since last used
webPushSubscriptionSchema.virtual('daysSinceLastUsed').get(function() {
  return Math.floor((Date.now() - this.lastUsed.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for browser info
webPushSubscriptionSchema.virtual('browserInfo').get(function() {
  if (this.browser && this.browser.name) {
    return `${this.browser.name} ${this.browser.version || ''}`.trim();
  }
  return 'Unknown Browser';
});

// Virtual for OS info
webPushSubscriptionSchema.virtual('osInfo').get(function() {
  if (this.os && this.os.name) {
    return `${this.os.name} ${this.os.version || ''}`.trim();
  }
  return 'Unknown OS';
});

// JSON transform
webPushSubscriptionSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('WebPushSubscription', webPushSubscriptionSchema);