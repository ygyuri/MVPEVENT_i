const express = require('express');
const router = express.Router();

const databaseIndexes = require('../services/databaseIndexes');

// Models
const MarketingAgency = require('../models/MarketingAgency');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const ReferralLink = require('../models/ReferralLink');
const ReferralClick = require('../models/ReferralClick');
const ReferralConversion = require('../models/ReferralConversion');
const AffiliatePayout = require('../models/AffiliatePayout');
const AffiliatePerformanceCache = require('../models/AffiliatePerformanceCache');
const FraudDetectionLog = require('../models/FraudDetectionLog');
const Event = require('../models/Event');

function generateCode(prefix = '') {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${rand}`;
}

// GET /api/debug/affiliate/health
router.get('/affiliate/health', async (req, res) => {
  try {
    const [idxStats, counts] = await Promise.all([
      databaseIndexes.getIndexStats(),
      Promise.all([
        MarketingAgency.countDocuments(),
        AffiliateMarketer.countDocuments(),
        EventCommissionConfig.countDocuments(),
        ReferralLink.countDocuments(),
        ReferralClick.countDocuments(),
        ReferralConversion.countDocuments(),
        AffiliatePayout.countDocuments(),
        AffiliatePerformanceCache.countDocuments(),
        FraudDetectionLog.countDocuments()
      ])
    ]);

    const [agencies, affiliates, commissionConfigs, links, clicks, conversions, payouts, perfCache, fraudLogs] = counts;

    res.json({
      ok: true,
      indexStats: idxStats,
      collections: {
        agencies,
        affiliates,
        commissionConfigs,
        links,
        clicks,
        conversions,
        payouts,
        perfCache,
        fraudLogs
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'health failed' });
  }
});

// POST /api/debug/affiliate/generate-links
// Body: { limit?: number }
router.post('/affiliate/generate-links', async (req, res) => {
  try {
    const { limit = 5 } = req.body || {};

    const events = await Event.find({ status: 'published' }).limit(Math.max(1, Math.min(20, limit)));
    if (!events.length) {
      return res.status(400).json({ ok: false, message: 'No published events found' });
    }

    const primaryAgency = await MarketingAgency.findOne({ agency_type: 'primary', status: 'active' });
    const affiliates = await AffiliateMarketer.find({ status: 'active' }).limit(10);

    const created = [];
    for (const event of events) {
      if (primaryAgency) {
        const code = generateCode('AG-');
        const exists = await ReferralLink.findOne({ referral_code: code });
        if (!exists) {
          const rl = await ReferralLink.create({
            event_id: event._id,
            agency_id: primaryAgency._id,
            referral_code: code,
            campaign_name: `Agency Campaign - ${event.title}`,
            utm_source: 'agency',
            utm_medium: 'social',
            utm_campaign: `ev-${event._id.toString().slice(-6)}`,
            status: 'active'
          });
          created.push({ type: 'agency', id: rl._id, code: rl.referral_code });
        }
      }

      for (const aff of affiliates) {
        const code = generateCode('AFF-');
        const exists = await ReferralLink.findOne({ referral_code: code });
        if (!exists) {
          const rl = await ReferralLink.create({
            event_id: event._id,
            affiliate_id: aff._id,
            referral_code: code,
            campaign_name: `Affiliate Campaign - ${aff.first_name}`,
            utm_source: 'affiliate',
            utm_medium: 'influencer',
            utm_campaign: `ev-${event._id.toString().slice(-6)}`,
            status: 'active'
          });
          created.push({ type: 'affiliate', id: rl._id, code: rl.referral_code });
        }
      }
    }

    res.json({ ok: true, createdCount: created.length, created });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'generate-links failed' });
  }
});

module.exports = router;


