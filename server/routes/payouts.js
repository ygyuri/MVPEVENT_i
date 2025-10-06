const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { body, param } = require('express-validator');
const AffiliatePayout = require('../models/AffiliatePayout');
const ReferralConversion = require('../models/ReferralConversion');

const router = express.Router();

// GET /api/organizer/payouts/pending
router.get('/organizer/payouts/pending', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const payouts = await AffiliatePayout.find({ payout_status: 'scheduled', organizer_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ ok: true, payouts });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/organizer/payouts/:payoutId/approve
router.post('/organizer/payouts/:payoutId/approve', verifyToken, requireRole(['organizer','admin']), [param('payoutId').isString()], async (req, res) => {
  try {
    const p = await AffiliatePayout.findById(req.params.payoutId);
    if (!p) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    if (String(p.organizer_id) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    p.payout_status = 'processing';
    p.processed_at = new Date();
    await p.save();
    res.json({ ok: true, payout: p });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/organizer/payouts/:payoutId/reject
router.post('/organizer/payouts/:payoutId/reject', verifyToken, requireRole(['organizer','admin']), [param('payoutId').isString(), body('reason').optional().isString()], async (req, res) => {
  try {
    const p = await AffiliatePayout.findById(req.params.payoutId);
    if (!p) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    if (String(p.organizer_id) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    p.payout_status = 'cancelled';
    p.failure_reason = req.body.reason || 'Rejected by organizer';
    p.failed_at = new Date();
    await p.save();
    // Roll back conversions to pending
    await ReferralConversion.updateMany({ _id: { $in: (p.conversion_ids || []) } }, { $set: { affiliate_payout_status: 'pending', affiliate_payout_id: null } });
    res.json({ ok: true, payout: p });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/affiliates/payouts
router.get('/affiliates/payouts', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const payouts = await AffiliatePayout.find({ affiliate_id: req.user._id }).sort({ createdAt: -1 });
    res.json({ ok: true, payouts });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/admin/payouts/batch-process
router.post('/admin/payouts/batch-process', verifyToken, requireRole(['admin']), [body('payoutIds').isArray()], async (req, res) => {
  try {
    const { payoutIds = [] } = req.body;
    const updated = await AffiliatePayout.updateMany({ _id: { $in: payoutIds } }, { $set: { payout_status: 'completed', completed_at: new Date() } });
    res.json({ ok: true, updated: updated.modifiedCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


