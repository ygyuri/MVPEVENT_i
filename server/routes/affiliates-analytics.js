const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const affiliateAnalytics = require('../services/affiliateAnalyticsService');

const router = express.Router();

router.get('/affiliates/dashboard/overview', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.overview({ affiliateId: aff, userId: req.user._id, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/affiliates/dashboard/performance', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.performance({ affiliateId: aff, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/affiliates/dashboard/conversions', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.conversions({ affiliateId: aff, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/affiliates/dashboard/top-events', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.topEvents({ affiliateId: aff, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/affiliates/dashboard/geographic', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.geographic({ affiliateId: aff, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/affiliates/dashboard/earnings-forecast', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const aff = req.user.role === 'affiliate' ? req.user._id : req.query.affiliateId;
    if (!aff) return res.status(400).json({ ok: false, error: 'affiliateId required' });
    const data = await affiliateAnalytics.forecast({ affiliateId: aff, query: req.query });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


