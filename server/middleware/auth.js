const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const tokenHeader = req.headers.authorization || '';
    const token = tokenHeader.startsWith('Bearer ') ? tokenHeader.split(' ')[1] : (req.cookies?.token);
    
    if (!token) {
      // Debug log for missing token
      console.warn('[AUTH] Missing token on', req.method, req.originalUrl, {
        hasAuthHeader: !!req.headers.authorization,
        hasCookie: !!req.cookies?.token
      });
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is still valid in database
    const session = await Session.findOne({
      sessionToken: token,
      expiresAt: { $gt: new Date() },
      isActive: true
    });

    if (!session) {
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Get user data
    const user = await User.findOne({
      _id: decoded.userId,
      isActive: true
    }).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found or inactive.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update session last used
    await session.updateLastUsed();

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return next(); // Continue without user data
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findOne({
      _id: decoded.userId,
      isActive: true
    }).select('-passwordHash');

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Silently continue without user data
    next();
  }
};

// Rate limiting for auth endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window (increased from 5)
  message: { 
    error: 'Too many authentication attempts. Please try again in a few minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Add delay to prevent brute force while being user-friendly
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
  // Add a more gradual approach
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts. Please wait a few minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Separate, more lenient rate limit for registration
const registrationRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 registration attempts per 15 minutes
  message: {
    error: 'Too many registration attempts. Please wait a few minutes before trying again.',
    code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many registration attempts. Please wait a few minutes before trying again.',
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Separate, more lenient rate limit for login
const loginRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please wait a few minutes before trying again.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please wait a few minutes before trying again.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = {
  verifyToken,
  requireRole,
  optionalAuth,
  authRateLimit,
  registrationRateLimit,
  loginRateLimit,
  JWT_SECRET
}; 