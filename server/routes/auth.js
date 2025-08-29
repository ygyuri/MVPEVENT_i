const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const { verifyToken, requireRole, registrationRateLimit, loginRateLimit, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Store session in database
const storeSession = async (userId, accessToken, refreshToken, req) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const session = new Session({
    userId,
    sessionToken: accessToken,
    refreshToken,
    expiresAt,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection.remoteAddress
  });

  await session.save();
  return session;
};

// Registration endpoint
router.post('/register', registrationRateLimit, [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required and must be less than 100 characters'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required and must be less than 100 characters'),
  body('role').optional().isIn(['customer','organizer']).withMessage('Role must be customer or organizer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Please check your input and try again.',
        details: errors.array().map(err => ({ field: err.path, message: err.msg, value: err.value }))
      });
    }

    const { email, password, username, firstName, lastName, walletAddress } = req.body;
    const role = ['customer','organizer'].includes(req.body.role) ? req.body.role : 'customer';

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'An account with this email already exists. Please try logging in instead.', code: 'EMAIL_EXISTS' });
      }
      return res.status(409).json({ error: 'This username is already taken. Please choose a different username.', code: 'USERNAME_EXISTS' });
    }

    // Create user
    const user = new User({ email, username, firstName, lastName, walletAddress: walletAddress || null, emailVerified: false, role });

    // Set password (bcrypt 12 rounds)
    await user.setPassword(password);
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeSession(user._id, accessToken, refreshToken, req);

    res.status(201).json({
      message: 'Account created successfully! Welcome to Event-i!',
      user: { id: user._id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName, role: user.role },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login endpoint
router.post('/login', loginRateLimit, [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Please check your input and try again.',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS',
        suggestion: 'Make sure your email is correct and try again.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Your account has been deactivated. Please contact support for assistance.',
        code: 'ACCOUNT_DEACTIVATED',
        suggestion: 'Contact our support team to reactivate your account.'
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS',
        suggestion: 'Make sure your password is correct and try again.'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeSession(user._id, accessToken, refreshToken, req);

    res.json({
      message: 'Welcome back! You have successfully logged in.',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Remove session from database
    await Session.findOneAndDelete({ sessionToken: token });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        walletAddress: user.walletAddress,
        emailVerified: user.emailVerified,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    // Check if session exists
    const session = await Session.findOne({
      refreshToken,
      expiresAt: { $gt: new Date() },
      isActive: true
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    
    // Update session
    session.sessionToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.lastUsedAt = new Date();
    await session.save();

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Update user profile
router.put('/profile', verifyToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isMobilePhone(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, phone, city, country, preferences } = req.body;

    // Update user
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone || city || country || preferences) {
      updateData.profile = {
        phone: phone || req.user.profile?.phone,
        city: city || req.user.profile?.city,
        country: country || req.user.profile?.country,
        preferences: preferences || req.user.profile?.preferences || {}
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router; 