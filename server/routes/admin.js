const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { param, body, validationResult } = require('express-validator');
const User = require('../models/User');
const Event = require('../models/Event');
const Session = require('../models/Session');
const ScanLog = require('../models/ScanLog');
const emailService = require('../services/emailService');

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

// Update event flags (admin only)
router.patch('/events/:eventId/flags', verifyToken, requireRole('admin'), [
  param('eventId').isMongoId(),
  body('isFeatured').optional().isBoolean(),
  body('isTrending').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { eventId } = req.params;
    const { isFeatured, isTrending } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update flags
    if (typeof isFeatured === 'boolean') {
      event.flags.isFeatured = isFeatured;
    }
    if (typeof isTrending === 'boolean') {
      event.flags.isTrending = isTrending;
    }

    await event.save();

    res.json({ 
      success: true, 
      data: { 
        id: event._id, 
        flags: event.flags 
      } 
    });

  } catch (error) {
    console.error('Update event flags error:', error);
    res.status(500).json({ error: 'Failed to update event flags' });
  }
});

module.exports = router;

// Scan logs with filters (admin only)
router.get('/scan-logs', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { eventId, result, from, to, page = 1, limit = 20 } = req.query;
    const query = {};
    if (eventId) query.eventId = eventId;
    if (result) query.result = result;
    if (from || to) {
      query.scannedAt = {};
      if (from) query.scannedAt.$gte = new Date(from);
      if (to) query.scannedAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ScanLog.find(query)
        .sort({ scannedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('ticketId', 'ticketType holder')
        .populate('eventId', 'title dates')
        .populate('scannedBy', 'email username')
        .lean(),
      ScanLog.countDocuments(query)
    ]);
    res.json({ success: true, data: { items, pagination: { page: Number(page), limit: Number(limit), total } } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load scan logs' });
  }
});

// Send a test email to verify SMTP
router.post('/test-email', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const to = req.body?.to || req.user.email;
    await emailService.testEmailConfiguration();
    const result = await emailService.transporter.sendMail({
      from: `"Event-i" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Event-i Test Email',
      text: 'This is a test email from Event-i.',
    });
    res.json({ success: true, messageId: result?.messageId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});
