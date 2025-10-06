const mongoose = require('mongoose');
const ReferralClick = require('../models/ReferralClick');
const ReferralConversion = require('../models/ReferralConversion');
const AffiliatePayout = require('../models/AffiliatePayout');
const AffiliatePerformanceCache = require('../models/AffiliatePerformanceCache');

function parsePeriod(q) {
  const now = new Date();
  const start = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  return { start, end: now, label: 'last_30_days' };
}

class AffiliateAnalyticsService {
  async overview({ affiliateId, userId, query = {} }) {
    const { start, end, label } = parsePeriod(query);

    const cache = await AffiliatePerformanceCache.findOne({ affiliate_id: affiliateId, time_period: 'month' }).sort({ last_updated_at: -1 });

    const clicksAgg = await ReferralClick.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), clicked_at: { $gte: start, $lte: end } } },
      { $group: { _id: '$visitor_id', count: { $sum: 1 } } }
    ]);
    const totalClicks = clicksAgg.reduce((s, x) => s + x.count, 0);
    const uniqueVisitors = clicksAgg.length;

    const convs = await ReferralConversion.find({ affiliate_id: affiliateId, converted_at: { $gte: start, $lte: end }, conversion_status: 'confirmed' });
    const totalConversions = convs.length;
    const totalRevenue = convs.reduce((s, c) => s + (c.organizer_revenue || 0), 0);
    const totalCommission = convs.reduce((s, c) => s + (c.affiliate_commission || 0) + (c.tier_2_affiliate_commission || 0), 0);

    const pending = await ReferralConversion.countDocuments({ affiliate_id: affiliateId, affiliate_payout_status: 'pending' });
    const scheduled = await ReferralConversion.countDocuments({ affiliate_id: affiliateId, affiliate_payout_status: 'scheduled' });
    const paidAgg = await AffiliatePayout.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), payout_status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$net_payout_amount' } } }
    ]);
    const paidCommission = paidAgg[0]?.total || 0;

    const conversionRate = uniqueVisitors > 0 ? (totalConversions / uniqueVisitors) * 100 : 0;

    return {
      time_period: label,
      summary: {
        total_clicks: totalClicks,
        unique_visitors: uniqueVisitors,
        total_conversions: totalConversions,
        conversion_rate: Number(conversionRate.toFixed(2)),
        total_revenue_generated: Number(totalRevenue.toFixed(2)),
        total_commission_earned: Number(totalCommission.toFixed(2)),
        pending_commission: pending + scheduled, // simplified
        paid_commission: Number(paidCommission.toFixed(2)),
        next_payout_date: null,
        next_payout_amount: null
      },
      trend: {
        clicks_change_percent: 0,
        conversions_change_percent: 0,
        earnings_change_percent: 0
      },
      top_events: []
    };
  }

  async performance({ affiliateId, query = {} }) {
    const { start, end } = parsePeriod(query);
    const buckets = await ReferralConversion.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), converted_at: { $gte: start, $lte: end } } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$converted_at' } } }, conversions: { $sum: 1 }, earnings: { $sum: '$affiliate_commission' } } },
      { $sort: { '_id.day': 1 } }
    ]);
    return { time_buckets: buckets };
  }

  async conversions({ affiliateId, query = {} }) {
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const items = await ReferralConversion.find({ affiliate_id: affiliateId }).sort({ converted_at: -1 }).limit(limit);
    return { items };
  }

  async topEvents({ affiliateId, query = {} }) {
    const { start, end } = parsePeriod(query);
    const agg = await ReferralConversion.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), converted_at: { $gte: start, $lte: end } } },
      { $group: { _id: '$event_id', conversions: { $sum: 1 }, commission_earned: { $sum: '$affiliate_commission' } } },
      { $sort: { commission_earned: -1 } },
      { $limit: 10 }
    ]);
    return { events: agg };
  }

  async geographic({ affiliateId, query = {} }) {
    const { start, end } = parsePeriod(query);
    const geo = await ReferralClick.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), clicked_at: { $gte: start, $lte: end } } },
      { $group: { _id: '$country', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 20 }
    ]);
    return { countries: geo };
  }

  async forecast({ affiliateId, query = {} }) {
    const { start, end } = parsePeriod(query);
    const lastWeeks = await ReferralConversion.aggregate([
      { $match: { affiliate_id: new mongoose.Types.ObjectId(affiliateId), converted_at: { $gte: new Date(end.getTime() - (28 * 24 * 60 * 60 * 1000)) } } },
      { $group: { _id: null, avg: { $avg: '$affiliate_commission' }, total: { $sum: '$affiliate_commission' } } }
    ]);
    const avg = lastWeeks[0]?.avg || 0;
    return { projected_next_30_days: Number((avg * 30).toFixed(2)) };
  }
}

module.exports = new AffiliateAnalyticsService();


