const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const commissionService = require('../services/commissionService');

const router = express.Router();

function commissionConfigErrorResponse(e) {
  const msg = e?.message || 'Failed to save commission settings';
  if (e?.name === 'CastError' || /Cast to ObjectId|BSONError/i.test(msg)) {
    return {
      status: 400,
      error:
        'Invalid or empty agency ID. Set Primary agency to "None" if you are not using one, and pick an agency for each program row.'
    };
  }
  return { status: e.statusCode || 500, error: msg };
}

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
  body('minimum_payout_amount').optional().isFloat({ min: 0 }),
  body('agency_programs').optional().isArray(),
  body('flat_affiliate_pct_of_ticket').optional().isFloat({ min: 0, max: 100 }),
  body('use_event_commission_for_waterfall').optional().isBoolean(),
  body('event_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('forceByAdmin').optional().isBoolean()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const isAdmin = req.user.role === 'admin';
    const cfg = await commissionService.setConfig(req.params.eventId, req.user._id, req.body, { isAdmin });
    res.status(201).json({ ok: true, config: cfg });
  } catch (e) {
    const { status, error } = commissionConfigErrorResponse(e);
    res.status(status).json({ ok: false, error });
  }
});

// GET /api/events/:eventId/commission-config
router.get('/events/:eventId/commission-config', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const cfg = await commissionService.getConfig(req.params.eventId);
    const Event = require('../models/Event');
    const event = await Event.findById(req.params.eventId).select('commissionRate title').lean();
    if (!event) return res.status(404).json({ ok: false, error: 'EVENT_NOT_FOUND' });
    res.json({
      ok: true,
      config: cfg,
      event_commission_rate: event?.commissionRate ?? null,
      event_title: event?.title ?? null
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/events/:eventId/commission-config
router.patch('/events/:eventId/commission-config', verifyToken, requireRole(['organizer','admin']), async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const cfg = await commissionService.setConfig(req.params.eventId, req.user._id, req.body, { isAdmin });
    res.json({ ok: true, config: cfg });
  } catch (e) {
    const { status, error } = commissionConfigErrorResponse(e);
    res.status(status).json({ ok: false, error });
  }
});

// POST /api/events/:eventId/commission-config/preview
router.post('/events/:eventId/commission-config/preview', verifyToken, requireRole(['organizer','admin']), [
  body('ticket_price').isFloat({ min: 0.01 }),
  body('scenario').optional().isIn(['flat', 'agency_sub', 'agency_head'])
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const breakdown = await commissionService.preview(req.params.eventId, req.user._id, {
      ticket_price: req.body.ticket_price,
      scenario: req.body.scenario || 'flat'
    });
    res.json({ ok: true, breakdown });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


