const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware for event updates
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
 * Rate limiter for organizer updates (10 per hour)
 */
const organizerUpdateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 updates per hour
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return `org_updates:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'ORGANIZER_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 10 updates per hour allowed',
    retry_after: 3600
  }
});

/**
 * Rate limiter for reactions (30 per minute)
 */
const reactionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 reactions per minute
  keyGenerator: (req) => {
    return `reactions:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'REACTION_RATE_LIMIT_EXCEEDED',
    message: 'Maximum 30 reactions per minute allowed',
    retry_after: 60
  }
});

/**
 * Rate limiter for general API requests
 */
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => {
    return `general:${req.user?._id || req.ip}`;
  },
  message: {
    error: 'GENERAL_RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
    retry_after: 900
  }
});

/**
 * Rate limiter for authentication attempts
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    return `auth:${req.ip}`;
  },
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later',
    retry_after: 900
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Rate limiter for WebSocket connections
 */
const websocketLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 connection attempts per minute
  keyGenerator: (req) => {
    return `websocket:${req.ip}`;
  },
  message: {
    error: 'WEBSOCKET_RATE_LIMIT_EXCEEDED',
    message: 'Too many WebSocket connection attempts',
    retry_after: 60
  }
});

/**
 * Custom rate limiter factory
 */
function rateLimit(options) {
  return createRateLimiter(options);
}

/**
 * Middleware to check rate limits for specific operations
 */
async function checkOperationRateLimit(operation, req, res, next) {
  try {
    const userId = req.user?._id;
    const operationLimits = {
      'create_update': { windowMs: 60 * 60 * 1000, max: 10 }, // 10 per hour
      'add_reaction': { windowMs: 60 * 1000, max: 30 }, // 30 per minute
      'mark_read': { windowMs: 60 * 1000, max: 100 }, // 100 per minute
      'edit_update': { windowMs: 60 * 1000, max: 5 }, // 5 per minute
      'delete_update': { windowMs: 60 * 1000, max: 5 } // 5 per minute
    };

    const limit = operationLimits[operation];
    if (!limit) {
      return next(); // No limit for this operation
    }

    // Check if user has exceeded the limit
    const key = `${operation}:${userId}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // This would typically use Redis or another cache
    // For now, we'll use a simple in-memory approach
    if (!global.rateLimitCache) {
      global.rateLimitCache = new Map();
    }

    const userLimits = global.rateLimitCache.get(key) || [];
    const recentRequests = userLimits.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= limit.max) {
      return res.status(429).json({
        error: 'OPERATION_RATE_LIMIT_EXCEEDED',
        message: `Maximum ${limit.max} ${operation} operations per ${limit.windowMs / 1000 / 60} minutes allowed`,
        retry_after: Math.ceil(limit.windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    global.rateLimitCache.set(key, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupRateLimitCache();
    }

    next();

  } catch (error) {
    console.error('Rate limit check error:', error);
    next(); // Continue on error
  }
}

/**
 * Clean up old rate limit cache entries
 */
function cleanupRateLimitCache() {
  if (!global.rateLimitCache) return;

  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, timestamps] of global.rateLimitCache.entries()) {
    const recentTimestamps = timestamps.filter(timestamp => timestamp > now - maxAge);
    
    if (recentTimestamps.length === 0) {
      global.rateLimitCache.delete(key);
    } else {
      global.rateLimitCache.set(key, recentTimestamps);
    }
  }
}

/**
 * Get rate limit status for a user
 */
function getRateLimitStatus(userId, operation) {
  if (!global.rateLimitCache) return null;

  const key = `${operation}:${userId}`;
  const timestamps = global.rateLimitCache.get(key) || [];
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const windowStart = now - windowMs;
  const recentRequests = timestamps.filter(timestamp => timestamp > windowStart);

  return {
    operation,
    current: recentRequests.length,
    limit: 10, // Default limit
    reset_time: new Date(now + windowMs).toISOString(),
    remaining: Math.max(0, 10 - recentRequests.length)
  };
}

module.exports = {
  createRateLimiter,
  organizerUpdateLimiter,
  reactionLimiter,
  generalLimiter,
  authLimiter,
  websocketLimiter,
  rateLimit,
  checkOperationRateLimit,
  getRateLimitStatus
};
