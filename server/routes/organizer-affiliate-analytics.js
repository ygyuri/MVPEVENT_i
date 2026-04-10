const express = require('express');
const { param, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const orgAnalytics = require('../services/organizerAffiliateAnalyticsService');
const eventAffiliatePerformance = require('../services/eventAffiliatePerformanceService');

const router = express.Router();

router.get('/organizer/events/:eventId/affiliate-performance', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const isAdmin = req.user.role === 'admin';
    const data = await eventAffiliatePerformance.performanceForEvent({
      eventId: req.params.eventId,
      userId: req.user._id,
      isAdmin
    });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

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


