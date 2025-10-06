const mongoose = require('mongoose');

const affiliatePerformanceCacheSchema = new mongoose.Schema({
  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  time_period: { type: String, enum: ['today', 'week', 'month', 'quarter', 'year', 'all_time'], required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },

  total_clicks: { type: Number, default: 0 },
  unique_visitors: { type: Number, default: 0 },
  returning_visitors: { type: Number, default: 0 },

  total_conversions: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  total_revenue_generated: { type: Number, default: 0 },
  average_order_value: { type: Number, default: 0 },

  total_commission_earned: { type: Number, default: 0 },
  pending_commission: { type: Number, default: 0 },
  paid_commission: { type: Number, default: 0 },

  top_countries: { type: mongoose.Schema.Types.Mixed },
  top_cities: { type: mongoose.Schema.Types.Mixed },

  desktop_clicks: { type: Number, default: 0 },
  mobile_clicks: { type: Number, default: 0 },
  tablet_clicks: { type: Number, default: 0 },

  hourly_distribution: { type: mongoose.Schema.Types.Mixed },
  daily_distribution: { type: mongoose.Schema.Types.Mixed },

  last_updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

affiliatePerformanceCacheSchema.index({ affiliate_id: 1, time_period: 1, period_start: 1 });
affiliatePerformanceCacheSchema.index({ agency_id: 1, time_period: 1, period_start: 1 });

module.exports = mongoose.models.AffiliatePerformanceCache || mongoose.model('AffiliatePerformanceCache', affiliatePerformanceCacheSchema);


