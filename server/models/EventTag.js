const mongoose = require('mongoose');

const eventTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
eventTagSchema.index({ name: 1 });
eventTagSchema.index({ isActive: 1 });

// Virtual for formatted name
eventTagSchema.virtual('displayName').get(function() {
  return this.name.charAt(0).toUpperCase() + this.name.slice(1);
});

// Method to increment usage count
eventTagSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to find active tags
eventTagSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find popular tags
eventTagSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

module.exports = mongoose.model('EventTag', eventTagSchema);
