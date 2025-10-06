const mongoose = require('mongoose');
const redisManager = require('../config/redis');
const ReferralClick = require('../models/ReferralClick');
const ReferralConversion = require('../models/ReferralConversion');
const AffiliatePerformanceCache = require('../models/AffiliatePerformanceCache');

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

async function refreshPeriod({ time_period, periodStart, periodEnd }) {
  // Aggregate clicks
  const clicksAgg = await ReferralClick.aggregate([
    { $match: { clicked_at: { $gte: periodStart, $lte: periodEnd } } },
    { $group: { _id: { affiliate_id: '$affiliate_id' }, total_clicks: { $sum: 1 }, unique_visitors: { $addToSet: '$visitor_id' } } },
    { $project: { affiliate_id: '$_id.affiliate_id', total_clicks: 1, unique_visitors: { $size: '$unique_visitors' } } }
  ]);

  // Aggregate conversions
  const convAgg = await ReferralConversion.aggregate([
    { $match: { converted_at: { $gte: periodStart, $lte: periodEnd }, conversion_status: 'confirmed' } },
    { $group: { _id: { affiliate_id: '$affiliate_id' }, total_conversions: { $sum: 1 }, total_revenue_generated: { $sum: '$organizer_revenue' }, total_commission_earned: { $sum: '$affiliate_commission' } } },
    { $project: { affiliate_id: '$_id.affiliate_id', total_conversions: 1, total_revenue_generated: 1, total_commission_earned: 1 } }
  ]);

  const mapClicks = new Map(clicksAgg.map(x => [String(x.affiliate_id), x]));
  const mapConv = new Map(convAgg.map(x => [String(x.affiliate_id), x]));

  const affiliateIds = new Set([...mapClicks.keys(), ...mapConv.keys()]);
  for (const affId of affiliateIds) {
    const c = mapClicks.get(affId) || { total_clicks: 0, unique_visitors: 0 };
    const v = mapConv.get(affId) || { total_conversions: 0, total_revenue_generated: 0, total_commission_earned: 0 };
    const conversion_rate = c.unique_visitors > 0 ? (v.total_conversions / c.unique_visitors) * 100 : 0;
    await AffiliatePerformanceCache.findOneAndUpdate(
      { affiliate_id: affId, time_period },
      {
        affiliate_id: affId,
        time_period,
        period_start: periodStart,
        period_end: periodEnd,
        total_clicks: c.total_clicks,
        unique_visitors: c.unique_visitors,
        total_conversions: v.total_conversions,
        conversion_rate: Number(conversion_rate.toFixed(2)),
        total_revenue_generated: v.total_revenue_generated,
        total_commission_earned: v.total_commission_earned,
        last_updated_at: new Date()
      },
      { upsert: true }
    );
  }
}

async function runRefresh() {
  const now = new Date();
  await refreshPeriod({ time_period: 'today', periodStart: startOfDay(now), periodEnd: endOfDay(now) });
}

function startScheduler() {
  // Use Redis-backed worker or simple setInterval fallback
  if (!redisManager.isRedisAvailable()) {
    setInterval(runRefresh, 15 * 60 * 1000); // 15 minutes
    return;
  }
  // In a fuller setup, schedule via BullMQ repeatable jobs
  setInterval(runRefresh, 15 * 60 * 1000);
}

module.exports = { startScheduler, runRefresh };


