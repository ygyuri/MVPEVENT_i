const AffiliateMarketer = require('../models/AffiliateMarketer');
const MarketingAgency = require('../models/MarketingAgency');

function err(status, message) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

const DISPOSABLE_DOMAINS = new Set(['mailinator.com','10minutemail.com','tempmail.com','guerrillamail.com']);

function isDisposable(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}

function generateReferralCode(firstName) {
  const base = (firstName || 'AFF').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${base}${rand}`.slice(0, 12);
}

function validateReferralCode(code) {
  if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return false;
  // TODO: profanity filter hook here
  return true;
}

async function assignUniqueReferralCode(firstName) {
  for (let i = 0; i < 24; i++) {
    const code = generateReferralCode(firstName);
    const exists = await AffiliateMarketer.findOne({ referral_code: code }).select('_id').lean();
    if (!exists) return code;
  }
  throw err(500, 'Could not assign a unique referral code');
}

class AffiliateService {
  /**
   * Solo marketer tied to an organizer (no marketing agency). Gets a unique referral code; links are created per event.
   */
  async createIndependentByOrganizer(organizerUserId, payload) {
    if (!organizerUserId) throw err(400, 'Organizer required');
    if (isDisposable(payload.email)) throw err(400, 'Disposable emails not allowed');

    const referral_code = await assignUniqueReferralCode(payload.first_name);

    const affiliate = await AffiliateMarketer.create({
      user_id: payload.user_id || null,
      organizer_creator_id: organizerUserId,
      agency_id: null,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      referral_code,
      affiliate_tier: 'tier_1',
      parent_affiliate_id: null,
      minimum_payout_threshold: payload.minimum_payout_threshold || 50,
      status: 'active'
    });
    return affiliate;
  }

  async listIndependentsByOrganizer(organizerUserId) {
    const items = await AffiliateMarketer.find({
      organizer_creator_id: organizerUserId,
      $or: [{ agency_id: null }, { agency_id: { $exists: false } }],
      deleted_at: null
    })
      .sort({ createdAt: -1 })
      .lean();
    return { items };
  }

  async createAffiliateByAgency(agencyId, payload) {
    const agency = await MarketingAgency.findById(agencyId);
    if (!agency) throw err(404, 'Agency not found');
    if (isDisposable(payload.email)) throw err(400, 'Disposable emails not allowed');

    // Organizer-created marketers always get a server-generated unique code (no client override).
    const referral_code = await assignUniqueReferralCode(payload.first_name);

    const affiliate = await AffiliateMarketer.create({
      user_id: payload.user_id || null,
      agency_id: agency._id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      referral_code,
      affiliate_tier: payload.affiliate_tier || 'tier_1',
      parent_affiliate_id: payload.parent_affiliate_id || null,
      minimum_payout_threshold: payload.minimum_payout_threshold || 50,
      status: payload.status === 'pending_approval' ? 'pending_approval' : 'active'
    });
    return affiliate;
  }

  async selfSignup(payload) {
    if (isDisposable(payload.email)) throw err(400, 'Disposable emails not allowed');

    const referral_code = payload.referral_code && validateReferralCode(payload.referral_code)
      ? payload.referral_code
      : generateReferralCode(payload.first_name);

    const exists = await AffiliateMarketer.findOne({ referral_code });
    if (exists) throw err(409, 'Referral code already exists');

    const affiliate = await AffiliateMarketer.create({
      user_id: payload.user_id || null,
      agency_id: payload.agency_id || null,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      referral_code,
      affiliate_tier: payload.affiliate_tier || 'tier_1',
      parent_affiliate_id: payload.parent_affiliate_id || null,
      minimum_payout_threshold: Math.max(10, payload.minimum_payout_threshold || 50),
      status: 'pending_approval'
    });
    return affiliate;
  }

  async listAgencyAffiliates(agencyId, { status, page = 1, limit = 20 } = {}) {
    const q = { agency_id: agencyId };
    if (status) q.status = status;
    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
    const [items, total] = await Promise.all([
      AffiliateMarketer.find(q).sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, limit)).lean(),
      AffiliateMarketer.countDocuments(q)
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getProfile(userId) {
    const aff = await AffiliateMarketer.findOne({ user_id: userId });
    if (!aff) throw err(404, 'Affiliate profile not found');
    return aff;
  }

  async updateProfile(userId, updates) {
    const aff = await AffiliateMarketer.findOne({ user_id: userId });
    if (!aff) throw err(404, 'Affiliate profile not found');
    if (updates.referral_code && updates.referral_code !== aff.referral_code) {
      if (!validateReferralCode(updates.referral_code)) throw err(400, 'Invalid referral code');
      const exists = await AffiliateMarketer.findOne({ referral_code: updates.referral_code });
      if (exists) throw err(409, 'Referral code already exists');
    }
    Object.assign(aff, updates, { updatedAt: new Date() });
    await aff.save();
    return aff;
  }

  async setPaymentMethod(userId, { payment_method, payment_details }) {
    const aff = await AffiliateMarketer.findOne({ user_id: userId });
    if (!aff) throw err(404, 'Affiliate profile not found');
    if (!['bank_transfer','paypal','stripe','crypto'].includes(payment_method)) throw err(400, 'Invalid payment_method');
    if (payment_method === 'paypal') {
      const email = payment_details?.email;
      if (!email || !/.+@.+\..+/.test(email)) throw err(400, 'Invalid PayPal email');
    }
    aff.payment_method = payment_method;
    aff.payment_details = payment_details;
    await aff.save();
    return aff;
  }
}

module.exports = new AffiliateService();


