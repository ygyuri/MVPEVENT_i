const mongoose = require('mongoose');
const ReferralConversion = require('../models/ReferralConversion');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const AffiliatePayout = require('../models/AffiliatePayout');

function days(n) { return n * 24 * 60 * 60 * 1000; }

async function calculatePendingPayouts({ now = new Date() } = {}) {
  // 1) Find conversions that are pending and past waiting period
  const cutoffByEvent = {};
  const configs = await EventCommissionConfig.find({});
  for (const cfg of configs) {
    const delay = (cfg.payout_delay_days || 7);
    cutoffByEvent[String(cfg.event_id)] = new Date(now.getTime() - days(delay));
  }

  const pending = await ReferralConversion.aggregate([
    { $match: { affiliate_payout_status: 'pending', conversion_status: 'confirmed' } },
    { $addFields: { eventIdStr: { $toString: '$event_id' } } }
  ]);

  const eligible = pending.filter(rc => {
    const cut = cutoffByEvent[rc.eventIdStr];
    if (!cut) return false;
    return new Date(rc.converted_at || rc.createdAt) < cut;
  });

  // 2) Group by affiliate_id + event_id
  const groups = new Map();
  for (const rc of eligible) {
    if (!rc.affiliate_id) continue; // agency payouts handled separately or later
    const key = `${rc.affiliate_id}|${rc.event_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rc);
  }

  const created = [];
  for (const [key, items] of groups.entries()) {
    const [affiliateId, eventId] = key.split('|');
    const cfg = configs.find(c => String(c.event_id) === String(eventId));
    if (!cfg) continue;
    const totalConversions = items.length;
    const totalRevenue = items.reduce((s, x) => s + (x.ticket_price || 0), 0);
    const grossCommission = items.reduce((s, x) => s + (x.affiliate_commission || 0) + (x.tier_2_affiliate_commission || 0), 0);

    if (grossCommission < (cfg.minimum_payout_amount || 50)) continue;

    const payout = await AffiliatePayout.create({
      payout_type: 'affiliate',
      affiliate_id: new mongoose.Types.ObjectId(affiliateId),
      agency_id: null,
      event_id: new mongoose.Types.ObjectId(eventId),
      organizer_id: cfg.organizer_id,
      payout_period_start: new Date(now.getFullYear(), now.getMonth(), 1),
      payout_period_end: now,
      total_conversions: totalConversions,
      total_revenue_generated: Number(totalRevenue.toFixed(2)),
      gross_commission: Number(grossCommission.toFixed(2)),
      deductions: 0,
      net_payout_amount: Number(grossCommission.toFixed(2)),
      payout_status: 'scheduled',
      conversion_ids: items.map(i => i._id)
    });

    await ReferralConversion.updateMany({ _id: { $in: items.map(i => i._id) } }, { $set: { affiliate_payout_status: 'scheduled', affiliate_payout_id: payout._id } });
    created.push(payout);
  }

  return created;
}

module.exports = { calculatePendingPayouts };


