const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const referralLinkService = require('../services/referralLinkService');

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

// POST /api/events/:eventId/referral-links
router.post('/events/:eventId/referral-links', verifyToken, requireRole(['affiliate','organizer','admin']), [
  param('eventId').isString(),
  body('affiliateId').optional().isString(),
  body('agencyId').optional().isString(),
  body('referral_code').optional().isString(),
  body('campaign_name').optional().isString(),
  body('utm').optional().isObject(),
  body('custom_landing_page_url').optional().isString(),
  body('expires_at').optional().isISO8601(),
  body('max_uses').optional().isInt({ min: 1 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const link = await referralLinkService.create({ eventId: req.params.eventId, ...req.body });
    res.status(201).json({ ok: true, link });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/affiliates/referral-links (current affiliate)
router.get('/affiliates/referral-links', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const items = await referralLinkService.listForAffiliate(req.user._id);
    res.json({ ok: true, links: items });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/referral-links/:linkId/preview
router.get('/referral-links/:linkId/preview', verifyToken, requireRole(['affiliate','organizer','admin']), [
  param('linkId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const pv = await referralLinkService.getPreview(req.params.linkId);
    res.json({ ok: true, preview: pv });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/referral-links/:linkId
router.patch('/referral-links/:linkId', verifyToken, requireRole(['affiliate','organizer','admin']), [
  param('linkId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const link = await referralLinkService.update(req.params.linkId, req.body);
    res.json({ ok: true, link });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/referral-links/:linkId
router.delete('/referral-links/:linkId', verifyToken, requireRole(['affiliate','organizer','admin']), [
  param('linkId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const result = await referralLinkService.remove(req.params.linkId);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// POST /api/referral-links/:linkId/shorten
router.post('/referral-links/:linkId/shorten', verifyToken, requireRole(['affiliate','organizer','admin']), [
  param('linkId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const out = await referralLinkService.shorten(req.params.linkId);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


