const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const commissionService = require('../services/commissionService');

const router = express.Router();

const handleValidation = (req, res) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
};

// POST /api/events/:eventId/commission-config
router.post('/events/:eventId/commission-config', verifyToken, requireRole(['organizer','admin']), [
  param('eventId').isString(),
  body('platform_fee_type').optional().isIn(['percentage','fixed','hybrid']),
  body('platform_fee_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('platform_fee_fixed').optional().isFloat({ min: 0 }),
  body('platform_fee_cap').optional().isFloat({ min: 0 }),
  body('primary_agency_id').optional().isString(),
  body('primary_agency_commission_type').optional().isIn(['percentage','fixed']),
  body('primary_agency_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('primary_agency_commission_fixed').optional().isFloat({ min: 0 }),
  body('affiliate_commission_enabled').optional().isBoolean(),
  body('affiliate_commission_type').optional().isIn(['percentage','fixed']),
  body('affiliate_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('affiliate_commission_fixed').optional().isFloat({ min: 0 }),
  body('affiliate_commission_base').optional().isIn(['ticket_price','organizer_revenue','agency_revenue']),
  body('enable_multi_tier').optional().isBoolean(),
  body('tier_2_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('tier_3_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('attribution_model').optional().isIn(['last_click','first_click','linear','time_decay']),
  body('attribution_window_days').optional().isInt({ min: 1, max: 365 }),
  body('payout_frequency').optional().isIn(['immediate','daily','weekly','monthly','manual']),
  body('payout_delay_days').optional().isInt({ min: 0, max: 180 }),
  body('minimum_payout_amount').optional().isFloat({ min: 0 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const cfg = await commissionService.setConfig(req.params.eventId, req.user._id, req.body);
    res.status(201).json({ ok: true, config: cfg });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/events/:eventId/commission-config
router.get('/events/:eventId/commission-config', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const cfg = await commissionService.getConfig(req.params.eventId);
    if (!cfg) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/events/:eventId/commission-config
router.patch('/events/:eventId/commission-config', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const cfg = await commissionService.setConfig(req.params.eventId, req.user._id, req.body);
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// POST /api/events/:eventId/commission-config/preview
router.post('/events/:eventId/commission-config/preview', verifyToken, requireRole(['organizer','admin']), [
  body('ticket_price').isFloat({ min: 0.01 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const breakdown = await commissionService.preview(req.params.eventId, req.user._id, req.body);
    res.json({ ok: true, breakdown });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


