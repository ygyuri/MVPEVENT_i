const express = require('express');
const { body, param } = require('express-validator');
const ReminderService = require('../services/reminderService');
const Reminder = require('../models/Reminder');
const { verifyToken } = require('../middleware/auth');
const { reminderQueue } = require('../services/queue/reminderQueue');

const router = express.Router();

// Bulk schedule on new purchase
router.post('/schedule', verifyToken, async (req, res) => {
  try {
    const { order } = req.body;
    if (!order?.status || order.status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid to schedule reminders' });
    }
    const result = await ReminderService.scheduleForTickets(order, { timezone: req.body.timezone });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: 'Failed to schedule reminders' });
  }
});

// List user's upcoming reminders
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(req.user.id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const reminders = await ReminderService.listUpcomingByUser(userId);
    res.json({ success: true, data: reminders });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load reminders' });
  }
});

// Update preferences
router.patch('/:id/preferences', verifyToken, async (req, res) => {
  try {
    const r = await ReminderService.updatePreferences(req.params.id, { deliveryMethod: req.body.deliveryMethod });
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (String(req.user.id) !== String(r.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ success: true, data: r });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Cancel specific reminder
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const r = await Reminder.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (String(req.user.id) !== String(r.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    r.status = 'cancelled';
    await r.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel reminder' });
  }
});

module.exports = router;
// Monitoring stub
router.get('/_monitor', verifyToken, async (req, res) => {
  try {
    const counts = await reminderQueue.getJobCounts();
    res.json({ success: true, data: counts });
  } catch (e) {
    res.status(200).json({ success: true, data: { note: 'monitor unavailable' } });
  }
});


