const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const affiliateService = require('../services/affiliateService');
const otpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const ReferralLink = require('../models/ReferralLink');

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

// Agency perspective: create affiliate under agency
// POST /api/agency/affiliates
router.post('/agency/affiliates', verifyToken, requireRole(['organizer','admin']), [
  body('agency_id').isString(),
  body('first_name').isString().isLength({ min: 1, max: 100 }),
  body('last_name').isString().isLength({ min: 1, max: 100 }),
  body('email').isEmail(),
  body('phone').optional().isString(),
  body('affiliate_tier').optional().isIn(['tier_1','tier_2','tier_3']),
  body('referral_code').optional().isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const a = await affiliateService.createAffiliateByAgency(req.body.agency_id, req.body);
    res.status(201).json({ ok: true, affiliate: a });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// Self-service affiliate signup
// POST /api/affiliates/signup
router.post('/affiliates/signup', [
  body('first_name').isString().isLength({ min: 1, max: 100 }),
  body('last_name').isString().isLength({ min: 1, max: 100 }),
  body('email').isEmail(),
  body('phone').optional().isString(),
  body('referral_code').optional().isString(),
  body('affiliate_tier').optional().isIn(['tier_1','tier_2','tier_3']),
  body('agency_id').optional().isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const a = await affiliateService.selfSignup(req.body);
    res.status(201).json({ ok: true, affiliate: a });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// List agency affiliates
// GET /api/agency/affiliates
router.get('/agency/affiliates', verifyToken, requireRole(['organizer','admin']), [
  query('agency_id').isString(),
  query('status').optional().isIn(['active','suspended','pending_approval']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const data = await affiliateService.listAgencyAffiliates(req.query.agency_id, req.query);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// Affiliate's own profile
// GET /api/affiliates/profile
router.get('/affiliates/profile', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const me = await affiliateService.getProfile(req.user._id);
    res.json({ ok: true, profile: me });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// Update affiliate profile
// PATCH /api/affiliates/profile
router.patch('/affiliates/profile', verifyToken, requireRole(['affiliate','organizer','admin']), [
  body('first_name').optional().isString().isLength({ min: 1, max: 100 }),
  body('last_name').optional().isString().isLength({ min: 1, max: 100 }),
  body('phone').optional().isString(),
  body('referral_code').optional().isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const me = await affiliateService.updateProfile(req.user._id, req.body);
    res.json({ ok: true, profile: me });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// Set payment method
// POST /api/affiliates/payment-method
router.post('/affiliates/payment-method', verifyToken, requireRole(['affiliate','organizer','admin']), [
  body('payment_method').isIn(['bank_transfer','paypal','stripe','crypto']),
  body('payment_details').isObject()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const me = await affiliateService.setPaymentMethod(req.user._id, req.body);
    res.json({ ok: true, profile: me });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

// GET /api/affiliates/:affiliateId/referrals
router.get('/affiliates/:affiliateId/referrals', verifyToken, requireRole(['affiliate','organizer','admin']), async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const links = await ReferralLink.find({ affiliate_id: affiliateId }).sort({ createdAt: -1 });
    res.json({ ok: true, links });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

// OTP endpoints (after module.exports export to avoid hoisting confusion in some bundlers)
router.post('/affiliates/phone/request-otp', [
  body('phone').isString()
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const { phone } = req.body;
    const code = await otpService.requestOtp(phone, { ttlSec: 300 });
    try {
      await SmsService.sendSms(phone, `Your verification code is ${code}`);
    } catch (e) {
      // Allow fallback in non-configured environments
      console.warn('SMS send failed, returning code in response for dev:', e?.message);
      return res.json({ ok: true, debugCode: code });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/affiliates/phone/verify-otp', [
  body('phone').isString(),
  body('code').isString().isLength({ min: 4, max: 6 })
], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const { phone, code } = req.body;
    const result = await otpService.verifyOtp(phone, code);
    if (!result.ok) return res.status(400).json({ ok: false, code: result.code });
    // Persist phone_verified for affiliate if bound to logged-in affiliate profile
    try {
      if (req.user?._id) {
        const AffiliateMarketer = require('../models/AffiliateMarketer');
        const me = await AffiliateMarketer.findOne({ user_id: req.user._id, phone });
        if (me) {
          me.phone_verified = true;
          await me.save();
        }
      }
    } catch (_) {}
    res.json({ ok: true, phone_verified: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


