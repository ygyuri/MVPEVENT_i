const rateLimit = require('express-rate-limit');
const Poll = require('../../models/Poll');

/**
 * Rate limiting middleware for poll operations
 * Prevents abuse and spam
 */

/**
 * Create a rate limiter with custom options
 */
function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retry_after: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  return rateLimit({ ...defaultOptions, ...options });
}

/**
 * Rate limiter for poll creation (5 per hour per event)
 */
const pollCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 polls per hour per event
  keyGenerator: (req) => {
    // Rate limit by user ID and event ID
    return `poll_creation:${req.user?._id || req.ip}:${req.params.eventId}`;
  },
  message: {
    error: 'POLL_CREATION_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 5 polls per hour allowed per event',
    retry_after: 3600
  }
});

/**
 * Rate limiter for voting (10 votes per minute)
 */
const votingLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 votes per minute
  keyGenerator: (req) => {
    return `voting:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'VOTING_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 10 votes per minute allowed',
    retry_after: 60
  }
});

/**
 * Rate limiter for poll results requests (30 per minute)
 */
const resultsLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyGenerator: (req) => {
    return `results:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'RESULTS_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 30 results requests per minute allowed',
    retry_after: 60
  }
});

/**
 * Rate limiter for poll management operations (20 per hour)
 */
const pollManagementLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 operations per hour
  keyGenerator: (req) => {
    return `poll_management:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'POLL_MANAGEMENT_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 20 poll management operations per hour allowed',
    retry_after: 3600
  }
});

/**
 * Rate limiter for anonymous token generation (5 per minute)
 */
const anonymousTokenLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 tokens per minute
  keyGenerator: (req) => {
    return `anonymous_token:${req.ip}`;
  },
  message: {
    error: 'ANONYMOUS_TOKEN_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 5 anonymous tokens per minute allowed',
    retry_after: 60
  }
});

/**
 * Custom rate limiter for poll creation with event-specific limits
 */
async function rateLimitPollCreation(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    if (!eventId || !userId) {
      return next();
    }

    // Check active poll count for this event
    const activePollCount = await Poll.countDocuments({
      event: eventId,
      status: 'active',
      deletedAt: null
    });

    const maxActivePolls = 5; // Configurable limit
    if (activePollCount >= maxActivePolls) {
      return res.status(429).json({
        error: 'POLL_LIMIT_EXCEEDED',
        message: `Maximum ${maxActivePolls} active polls allowed per event`,
        current_count: activePollCount,
        limit: maxActivePolls,
        retry_after: 3600
      });
    }

    // Check user's poll creation rate for this event
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentPolls = await Poll.countDocuments({
      event: eventId,
      organizer: userId,
      createdAt: { $gte: oneHourAgo }
    });

    const maxPollsPerHour = 3; // Configurable limit
    if (recentPolls >= maxPollsPerHour) {
      return res.status(429).json({
        error: 'POLL_CREATION_RATE_LIMIT_EXCEEDED',
        message: `Maximum ${maxPollsPerHour} polls per hour allowed per event`,
        current_count: recentPolls,
        limit: maxPollsPerHour,
        retry_after: 3600
      });
    }

    next();

  } catch (error) {
    console.error('Poll creation rate limit error:', error);
    next(); // Continue on error
  }
}

/**
 * Custom rate limiter for voting with poll-specific limits
 */
async function rateLimitVoting(req, res, next) {
  try {
    const { pollId } = req.params;
    const userId = req.user._id;

    if (!pollId) {
      return next();
    }

    // Check if user has already voted on this poll
    const PollVote = require('../../models/PollVote');
    const existingVote = await PollVote.findOne({
      poll: pollId,
      user: userId
    });

    if (existingVote) {
      // Allow vote updates but limit frequency
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (existingVote.updatedAt && existingVote.updatedAt > oneMinuteAgo) {
        return res.status(429).json({
          error: 'VOTE_UPDATE_RATE_LIMIT_EXCEEDED',
          message: 'Vote updates are limited to once per minute',
          retry_after: 60
        });
      }
    } else {
      // Check user's voting rate across all polls
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentVotes = await PollVote.countDocuments({
        user: userId,
        createdAt: { $gte: oneMinuteAgo }
      });

      const maxVotesPerMinute = 5; // Configurable limit
      if (recentVotes >= maxVotesPerMinute) {
        return res.status(429).json({
          error: 'VOTING_RATE_LIMIT_EXCEEDED',
          message: `Maximum ${maxVotesPerMinute} votes per minute allowed`,
          current_count: recentVotes,
          limit: maxVotesPerMinute,
          retry_after: 60
        });
      }
    }

    next();

  } catch (error) {
    console.error('Voting rate limit error:', error);
    next(); // Continue on error
  }
}

/**
 * Custom rate limiter for anonymous voting
 */
async function rateLimitAnonymousVoting(req, res, next) {
  try {
    const { pollId } = req.params;
    const { anonymousToken } = req.body;

    if (!pollId || !anonymousToken) {
      return next();
    }

    // Hash the anonymous token
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(anonymousToken).digest('hex');

    // Check if this token has already voted on this poll
    const PollVote = require('../../models/PollVote');
    const existingVote = await PollVote.findOne({
      poll: pollId,
      anonymousTokenHash: tokenHash
    });

    if (existingVote) {
      return res.status(409).json({
        error: 'ANONYMOUS_VOTE_ALREADY_EXISTS',
        message: 'This anonymous token has already voted on this poll'
      });
    }

    // Check anonymous voting rate by IP
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentAnonymousVotes = await PollVote.countDocuments({
      isAnonymous: true,
      ipAddress: req.ip,
      createdAt: { $gte: oneMinuteAgo }
    });

    const maxAnonymousVotesPerMinute = 3; // Configurable limit
    if (recentAnonymousVotes >= maxAnonymousVotesPerMinute) {
      return res.status(429).json({
        error: 'ANONYMOUS_VOTING_RATE_LIMIT_EXCEEDED',
        message: `Maximum ${maxAnonymousVotesPerMinute} anonymous votes per minute allowed from this IP`,
        current_count: recentAnonymousVotes,
        limit: maxAnonymousVotesPerMinute,
        retry_after: 60
      });
    }

    next();

  } catch (error) {
    console.error('Anonymous voting rate limit error:', error);
    next(); // Continue on error
  }
}

/**
 * Middleware to check rate limits for specific poll operations
 */
async function checkPollOperationRateLimit(operation, req, res, next) {
  try {
    const userId = req.user?._id;
    const operationLimits = {
      'create_poll': { windowMs: 60 * 60 * 1000, max: 5 }, // 5 per hour
      'vote_poll': { windowMs: 60 * 1000, max: 10 }, // 10 per minute
      'get_results': { windowMs: 60 * 1000, max: 30 }, // 30 per minute
      'update_poll': { windowMs: 60 * 1000, max: 5 }, // 5 per minute
      'close_poll': { windowMs: 60 * 1000, max: 3 }, // 3 per minute
      'delete_poll': { windowMs: 60 * 1000, max: 3 }, // 3 per minute
      'generate_anonymous_token': { windowMs: 60 * 1000, max: 5 } // 5 per minute
    };

    const limit = operationLimits[operation];
    if (!limit) {
      return next(); // No limit for this operation
    }

    // Check if user has exceeded the limit
    const key = `${operation}:${userId || req.ip}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // This would typically use Redis or another cache
    // For now, we'll use a simple in-memory approach
    if (!global.pollRateLimitCache) {
      global.pollRateLimitCache = new Map();
    }

    const userLimits = global.pollRateLimitCache.get(key) || [];
    const recentRequests = userLimits.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= limit.max) {
      return res.status(429).json({
        error: 'POLL_OPERATION_RATE_LIMIT_EXCEEDED',
        message: `Maximum ${limit.max} ${operation} operations per ${limit.windowMs / 1000 / 60} minutes allowed`,
        retry_after: Math.ceil(limit.windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    global.pollRateLimitCache.set(key, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupPollRateLimitCache();
    }

    next();

  } catch (error) {
    console.error('Poll operation rate limit check error:', error);
    next(); // Continue on error
  }
}

/**
 * Clean up old poll rate limit cache entries
 */
function cleanupPollRateLimitCache() {
  if (!global.pollRateLimitCache) return;

  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, timestamps] of global.pollRateLimitCache.entries()) {
    const recentTimestamps = timestamps.filter(timestamp => timestamp > now - maxAge);
    
    if (recentTimestamps.length === 0) {
      global.pollRateLimitCache.delete(key);
    } else {
      global.pollRateLimitCache.set(key, recentTimestamps);
    }
  }
}

/**
 * Get rate limit status for a user's poll operations
 */
function getPollRateLimitStatus(userId, operation) {
  if (!global.pollRateLimitCache) return null;

  const key = `${operation}:${userId}`;
  const timestamps = global.pollRateLimitCache.get(key) || [];
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const windowStart = now - windowMs;
  const recentRequests = timestamps.filter(timestamp => timestamp > windowStart);

  return {
    operation,
    current: recentRequests.length,
    limit: 5, // Default limit
    reset_time: new Date(now + windowMs).toISOString(),
    remaining: Math.max(0, 5 - recentRequests.length)
  };
}

module.exports = {
  createRateLimiter,
  pollCreationLimiter,
  votingLimiter,
  resultsLimiter,
  pollManagementLimiter,
  anonymousTokenLimiter,
  rateLimitPollCreation,
  rateLimitVoting,
  rateLimitAnonymousVoting,
  checkPollOperationRateLimit,
  getPollRateLimitStatus
};





