const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Session = require('../models/Session');

const router = express.Router();

// Admin health/overview
router.get('/overview', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [usersCount, eventsCount, activeSessions] = await Promise.all([
      User.countDocuments({}),
      Event.countDocuments({}),
      Session.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } })
    ]);

    res.json({
      ok: true,
      overview: {
        usersCount,
        eventsCount,
        activeSessions
      },
      me: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

// Example organizer/admin shared route
router.get('/users', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({}).select('email username role isActive createdAt');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

module.exports = router;
