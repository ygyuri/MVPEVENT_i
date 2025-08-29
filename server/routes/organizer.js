const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const Event = require('../models/Event');

const router = express.Router();

// Organizer dashboard summary
router.get('/overview', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const myEventsCount = await Event.countDocuments({ organizer: req.user._id });
    res.json({ ok: true, overview: { myEventsCount } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load organizer overview' });
  }
});

module.exports = router;
