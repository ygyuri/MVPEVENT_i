const crypto = require('crypto');
const ReferralLink = require('../models/ReferralLink');
const Event = require('../models/Event');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const MarketingAgency = require('../models/MarketingAgency');

function assert(condition, message, code = 400) {
  if (!condition) {
    const e = new Error(message);
    e.statusCode = code;
    throw e;
  }
}

function base62(n) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  do {
    s = chars[n % 62] + s;
    n = Math.floor(n / 62);
  } while (n > 0);
  return s;
}

function randomShortCode() {
  const n = crypto.randomInt(62 ** 5, 62 ** 6); // ~6 chars
  return base62(n);
}

function generateCode(prefix = '') {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${rand}`.slice(0, 12);
}

class ReferralLinkService {
  async create({ eventId, affiliateId, agencyId, referral_code, utm, campaign_name, custom_landing_page_url, expires_at, max_uses }) {
    const event = await Event.findById(eventId);
    assert(event && event.status === 'published', 'Event not found or not published', 404);
    assert(!(affiliateId && agencyId), 'Either affiliateId or agencyId required, not both');
    if (affiliateId) {
      const aff = await AffiliateMarketer.findById(affiliateId);
      assert(aff, 'Affiliate not found', 404);
    }
    if (agencyId) {
      const ag = await MarketingAgency.findById(agencyId);
      assert(ag, 'Agency not found', 404);
    }

    let code = referral_code || generateCode('RL-');
    const existing = await ReferralLink.findOne({ referral_code: code });
    if (existing) {
      code = generateCode('RL-');
    }

    const link = await ReferralLink.create({
      event_id: eventId,
      affiliate_id: affiliateId || null,
      agency_id: agencyId || null,
      referral_code: code,
      campaign_name: campaign_name || null,
      utm_source: utm?.source || null,
      utm_medium: utm?.medium || null,
      utm_campaign: utm?.campaign || null,
      utm_content: utm?.content || null,
      custom_landing_page_url: custom_landing_page_url || null,
      expires_at: expires_at || null,
      max_uses: max_uses || null
    });
    return link;
  }

  async listForAffiliate(affiliateUserId) {
    const aff = await AffiliateMarketer.findOne({ user_id: affiliateUserId });
    assert(aff, 'Affiliate profile not found', 404);
    const items = await ReferralLink.find({ affiliate_id: aff._id }).sort({ createdAt: -1 });
    return items;
  }

  async getPreview(linkId) {
    const link = await ReferralLink.findById(linkId).populate('event_id');
    assert(link, 'Link not found', 404);
    const eventSlug = link.event_id?.slug;
    const baseUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const url = `${baseUrl}/events/${eventSlug}?ref=${encodeURIComponent(link.referral_code)}`;
    return { url, link };
  }

  async update(linkId, updates) {
    const link = await ReferralLink.findById(linkId);
    assert(link, 'Link not found', 404);
    if (updates.status) assert(['active','paused','expired'].includes(updates.status), 'Invalid status');
    Object.assign(link, updates, { updatedAt: new Date() });
    await link.save();
    return link;
  }

  async remove(linkId) {
    const link = await ReferralLink.findById(linkId);
    assert(link, 'Link not found', 404);
    link.deleted_at = new Date();
    link.status = 'paused';
    await link.save();
    return { ok: true };
  }

  async shorten(linkId) {
    const link = await ReferralLink.findById(linkId);
    assert(link, 'Link not found', 404);
    let short;
    for (let i = 0; i < 5; i++) {
      short = randomShortCode();
      const exists = await ReferralLink.findOne({ short_url: short });
      if (!exists) break;
      short = null;
    }
    assert(short, 'Failed to generate unique short code', 500);
    link.short_url = short;
    await link.save();
    return { short: short };
  }
}

module.exports = new ReferralLinkService();


