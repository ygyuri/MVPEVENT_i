const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const orgAnalytics = require('../services/organizerAffiliateAnalyticsService');

const router = express.Router();

router.get('/organizer/analytics/affiliate-performance', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const data = await orgAnalytics.affiliatePerformance({ organizerId: req.user._id, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/organizer/analytics/agency-comparison', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const data = await orgAnalytics.agencyComparison({ organizerId: req.user._id, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/organizer/analytics/commission-breakdown', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const data = await orgAnalytics.commissionBreakdown({ organizerId: req.user._id, eventId: req.query.eventId, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/organizer/analytics/roi', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const data = await orgAnalytics.roi({ organizerId: req.user._id, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


