const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const agencyService = require('../services/agencyService');

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
};

// POST /api/organizer/marketing-agencies
router.post('/marketing-agencies', verifyToken, requireRole(['organizer','admin']), [
  body('agency_name').isString().trim().isLength({ min: 2, max: 200 }),
  body('agency_email').isEmail(),
  body('agency_type').optional().isIn(['primary','sub_affiliate']),
  body('parent_agency_id').optional().isString(),
  body('contact_person').optional().isString(),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('tax_id').optional().isString().isLength({ min: 3, max: 50 }),
  body('payment_method').optional().isIn(['bank_transfer','paypal','stripe','crypto']),
  body('payment_details').optional().isObject()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const agency = await agencyService.createAgency(req.user._id, req.body);
    res.status(201).json({ ok: true, agency });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/organizer/marketing-agencies
router.get('/marketing-agencies', verifyToken, requireRole(['organizer','admin']), [
  query('status').optional().isIn(['active','suspended','pending_approval']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const data = await agencyService.listAgencies(req.user._id, req.query);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/organizer/marketing-agencies/:agencyId
router.get('/marketing-agencies/:agencyId', verifyToken, requireRole(['organizer','admin']), [
  param('agencyId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const agency = await agencyService.getAgency(req.user._id, req.params.agencyId);
    res.json({ ok: true, agency });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/organizer/marketing-agencies/:agencyId
router.patch('/marketing-agencies/:agencyId', verifyToken, requireRole(['organizer','admin']), [
  param('agencyId').isString(),
  body('agency_name').optional().isString().isLength({ min: 2, max: 200 }),
  body('agency_email').optional().isEmail(),
  body('agency_type').optional().isIn(['primary','sub_affiliate']),
  body('parent_agency_id').optional().isString(),
  body('contact_person').optional().isString(),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('tax_id').optional().isString().isLength({ min: 3, max: 50 }),
  body('payment_method').optional().isIn(['bank_transfer','paypal','stripe','crypto']),
  body('payment_details').optional().isObject(),
  body('status').optional().isIn(['active','suspended','pending_approval'])
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const agency = await agencyService.updateAgency(req.user._id, req.params.agencyId, req.body);
    res.json({ ok: true, agency });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/organizer/marketing-agencies/:agencyId (soft delete)
router.delete('/marketing-agencies/:agencyId', verifyToken, requireRole(['organizer','admin']), [
  param('agencyId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const result = await agencyService.softDeleteAgency(req.user._id, req.params.agencyId);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// POST /api/organizer/marketing-agencies/:agencyId/approve
router.post('/marketing-agencies/:agencyId/approve', verifyToken, requireRole(['organizer','admin']), [
  param('agencyId').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const agency = await agencyService.approveAgency(req.user._id, req.params.agencyId);
    res.json({ ok: true, agency });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;


