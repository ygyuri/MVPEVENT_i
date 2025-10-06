const mongoose = require('mongoose');
const ReferralConversion = require('../models/ReferralConversion');
const MarketingAgency = require('../models/MarketingAgency');
const AffiliateMarketer = require('../models/AffiliateMarketer');

class OrganizerAffiliateAnalyticsService {
  async affiliatePerformance({ organizerId, query = {} }) {
    const agg = await ReferralConversion.aggregate([
      { $match: { conversion_status: 'confirmed' } },
      { $group: { _id: '$affiliate_id', conversions: { $sum: 1 }, commission_earned: { $sum: '$affiliate_commission' } } },
      { $sort: { commission_earned: -1 } },
      { $limit: 50 }
    ]);
    return { affiliates: agg };
  }

  async agencyComparison({ organizerId, query = {} }) {
    const agg = await ReferralConversion.aggregate([
      { $match: { conversion_status: 'confirmed' } },
      { $group: { _id: '$agency_id', conversions: { $sum: 1 }, commission_paid: { $sum: '$primary_agency_commission' } } },
      { $sort: { commission_paid: -1 } }
    ]);
    return { agencies: agg };
  }

  async commissionBreakdown({ organizerId, eventId, query = {} }) {
    const match = { conversion_status: 'confirmed' };
    if (eventId) match.event_id = new mongoose.Types.ObjectId(eventId);
    const agg = await ReferralConversion.aggregate([
      { $match: match },
      { $group: { _id: null, ticket_sales: { $sum: '$ticket_price' }, platform_fees: { $sum: '$platform_fee' }, organizer_revenue: { $sum: '$organizer_revenue' }, primary_agency: { $sum: '$primary_agency_commission' }, affiliates: { $sum: '$affiliate_commission' } } }
    ]);
    const row = agg[0] || { ticket_sales: 0, platform_fees: 0, organizer_revenue: 0, primary_agency: 0, affiliates: 0 };
    const organizer_net = row.organizer_revenue - row.primary_agency - row.affiliates;
    return {
      event_id: eventId || null,
      total_ticket_sales: Number(row.ticket_sales.toFixed(2)),
      breakdown: {
        platform_fees: Number(row.platform_fees.toFixed(2)),
        organizer_revenue: Number(row.organizer_revenue.toFixed(2)),
        commission_breakdown: {
          primary_agency: { total_commission: Number(row.primary_agency.toFixed(2)) },
          affiliates: { total_commission: Number(row.affiliates.toFixed(2)), top_performers: [] }
        },
        organizer_net: Number(organizer_net.toFixed(2)),
        organizer_net_percentage: row.ticket_sales > 0 ? Number(((organizer_net / row.ticket_sales) * 100).toFixed(2)) : 0
      },
      roi_metrics: {
        cost_per_acquisition: 0,
        return_on_ad_spend: row.affiliates > 0 ? Number((row.organizer_revenue / row.affiliates).toFixed(2)) : 0
      }
    };
  }

  async roi({ organizerId, query = {} }) {
    const agg = await ReferralConversion.aggregate([
      { $match: { conversion_status: 'confirmed' } },
      { $group: { _id: null, revenue: { $sum: '$organizer_revenue' }, commission: { $sum: '$affiliate_commission' } } }
    ]);
    const a = agg[0] || { revenue: 0, commission: 0 };
    return { cost_per_acquisition: 0, return_on_ad_spend: a.commission > 0 ? Number((a.revenue / a.commission).toFixed(2)) : 0 };
  }
}

module.exports = new OrganizerAffiliateAnalyticsService();


