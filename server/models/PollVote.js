const mongoose = require('mongoose');
const crypto = require('crypto');

const pollVoteSchema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  optionIds: [{
    type: String,
    required: true
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  anonymousTokenHash: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for performance
pollVoteSchema.index({ poll: 1 });
pollVoteSchema.index({ user: 1, poll: 1 }, { unique: true, sparse: true });
pollVoteSchema.index({ anonymousTokenHash: 1, poll: 1 }, { unique: true, sparse: true });
pollVoteSchema.index({ createdAt: -1 });
pollVoteSchema.index({ user: 1, createdAt: -1 });

// Validation
pollVoteSchema.pre('save', function(next) {
  // Validate optionIds is not empty
  if (!this.optionIds || this.optionIds.length === 0) {
    return next(new Error('At least one option must be selected'));
  }
  
  // Validate anonymous vote logic
  if (this.isAnonymous) {
    if (this.user) {
      return next(new Error('Anonymous votes cannot have a user'));
    }
    if (!this.anonymousTokenHash) {
      return next(new Error('Anonymous votes must have a token hash'));
    }
  } else {
    if (!this.user) {
      return next(new Error('Non-anonymous votes must have a user'));
    }
    if (this.anonymousTokenHash) {
      return next(new Error('Non-anonymous votes cannot have a token hash'));
    }
  }
  
  next();
});

// Static methods
pollVoteSchema.statics.generateAnonymousToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

pollVoteSchema.statics.hashAnonymousToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

pollVoteSchema.statics.findByPoll = function(pollId) {
  return this.find({ poll: pollId }).populate('user', 'username email');
};

pollVoteSchema.statics.findByUser = function(userId, pollId = null) {
  const query = { user: userId };
  if (pollId) {
    query.poll = pollId;
  }
  return this.find(query).populate('poll', 'question status');
};

pollVoteSchema.statics.findByAnonymousToken = function(tokenHash, pollId = null) {
  const query = { anonymousTokenHash: tokenHash };
  if (pollId) {
    query.poll = pollId;
  }
  return this.find(query).populate('poll', 'question status');
};

pollVoteSchema.statics.hasUserVoted = function(pollId, userId) {
  return this.findOne({ poll: pollId, user: userId });
};

pollVoteSchema.statics.hasAnonymousVoted = function(pollId, tokenHash) {
  return this.findOne({ poll: pollId, anonymousTokenHash: tokenHash });
};

pollVoteSchema.statics.getVoteCounts = function(pollId) {
  return this.aggregate([
    { $match: { poll: mongoose.Types.ObjectId(pollId) } },
    { $unwind: '$optionIds' },
    { $group: { _id: '$optionIds', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

pollVoteSchema.statics.getPollStatistics = function(pollId) {
  return this.aggregate([
    { $match: { poll: mongoose.Types.ObjectId(pollId) } },
    {
      $group: {
        _id: null,
        totalVotes: { $sum: 1 },
        anonymousVotes: {
          $sum: { $cond: ['$isAnonymous', 1, 0] }
        },
        identifiedVotes: {
          $sum: { $cond: ['$isAnonymous', 0, 1] }
        }
      }
    }
  ]);
};

// Instance methods
pollVoteSchema.methods.updateVote = function(newOptionIds) {
  this.optionIds = newOptionIds;
  return this.save();
};

// JSON serialization
pollVoteSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    // Don't expose anonymous token hash in API responses
    if (ret.isAnonymous) {
      delete ret.anonymousTokenHash;
    }
    return ret;
  }
});

module.exports = mongoose.model('PollVote', pollVoteSchema);





