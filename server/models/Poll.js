const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  options: [{
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    image_url: {
      type: String,
      trim: true
    },
    // Artist selection specific fields
    artist_name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    artist_genre: {
      type: String,
      trim: true,
      maxlength: 100
    },
    // Theme selection specific fields
    theme_color_hex: {
      type: String,
      trim: true,
      maxlength: 7
    },
    // Feature selection specific fields
    feature_cost: {
      type: Number,
      min: 0
    }
  }],
  pollType: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'artist_selection', 'theme_selection', 'feature_selection', 'general'],
    default: 'general'
  },
  maxVotes: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  allowAnonymous: {
    type: Boolean,
    default: false
  },
  showResultsBeforeVote: {
    type: Boolean,
    default: false
  },
  allow_vote_changes: {
    type: Boolean,
    default: true
  },
  closesAt: {
    type: Date,
    required: true
  },
  closedEarlyAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'draft'
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
pollSchema.index({ event: 1, deletedAt: 1 });
pollSchema.index({ organizer: 1, event: 1 });
pollSchema.index({ status: 1, deletedAt: 1 });
pollSchema.index({ closesAt: 1, status: 1 });
pollSchema.index({ createdAt: -1 });

// Validation
pollSchema.pre('save', function(next) {
  // Validate options count
  if (this.options.length < 2 || this.options.length > 10) {
    return next(new Error('Poll must have between 2 and 10 options'));
  }
  
  // Validate closesAt is in the future for active polls
  if (this.status === 'active' && this.closesAt <= new Date()) {
    return next(new Error('Active polls must close in the future'));
  }
  
  // Validate maxVotes for multiple choice
  if (this.pollType === 'multiple_choice' && this.maxVotes > this.options.length) {
    return next(new Error('maxVotes cannot exceed number of options'));
  }
  
  // Auto-generate option IDs if not provided
  this.options.forEach((option, index) => {
    if (!option.id) {
      option.id = `opt_${index + 1}`;
    }
  });
  
  next();
});

// Virtual for total votes (will be populated from poll results)
pollSchema.virtual('totalVotes', {
  ref: 'PollVote',
  localField: '_id',
  foreignField: 'poll',
  count: true
});

// Virtual for isExpired
pollSchema.virtual('isExpired').get(function() {
  return this.closesAt <= new Date();
});

// Virtual for canVote
pollSchema.virtual('canVote').get(function() {
  return this.status === 'active' && !this.isExpired && !this.deletedAt;
});

// Instance methods
pollSchema.methods.canUserVote = function(userId, anonymousToken = null) {
  if (!this.canVote) return false;
  
  // Check if user has already voted (this would need to be checked in service layer)
  // as we can't easily query PollVote from here
  return true;
};

pollSchema.methods.closeEarly = function() {
  if (this.status === 'active') {
    this.status = 'closed';
    this.closedEarlyAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

pollSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Static methods
pollSchema.statics.findActivePolls = function(eventId) {
  return this.find({
    event: eventId,
    status: 'active',
    deletedAt: null,
    closesAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

pollSchema.statics.findByEvent = function(eventId, includeDeleted = false) {
  const query = { event: eventId };
  if (!includeDeleted) {
    query.deletedAt = null;
  }
  return this.find(query).sort({ createdAt: -1 });
};

pollSchema.statics.findByOrganizer = function(organizerId, eventId = null) {
  const query = { organizer: organizerId, deletedAt: null };
  if (eventId) {
    query.event = eventId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// JSON serialization
pollSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Poll', pollSchema);





