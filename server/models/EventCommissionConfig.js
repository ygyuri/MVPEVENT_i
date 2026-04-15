const mongoose = require('mongoose');

const agencyProgramSchema = new mongoose.Schema({
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', required: true },
  pool_pct_of_ticket: { type: Number, min: 0, max: 100, required: true },
  sub_seller_pct_of_ticket: { type: Number, min: 0, max: 100, default: 0 },
  head_pct_of_ticket: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: false });

const independentMarketerRateSchema = new mongoose.Schema({
  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', required: true },
  pct_of_ticket: { type: Number, min: 0, max: 100, required: true }
}, { _id: false });

const eventCommissionConfigSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  /** Per-agency caps and head/sub split (percent of ticket). sub + head must equal pool per program. */
  agency_programs: { type: [agencyProgramSchema], default: [] },
  /** Solo marketers (no agency): commission % of ticket per AffiliateMarketer id. */
  independent_marketer_rates: { type: [independentMarketerRateSchema], default: [] },
  /** Simple affiliates (no agency program): % of ticket when flat_affiliate_pct_of_ticket is set; else legacy affiliate_commission_rate */
  flat_affiliate_pct_of_ticket: { type: Number, min: 0, max: 100, default: null },
  /** When true (default), waterfall uses Event.commissionRate for platform slice in previews/reporting */
  use_event_commission_for_waterfall: { type: Boolean, default: true },

  platform_fee_type: { type: String, enum: ['percentage', 'fixed', 'hybrid'], default: 'percentage' },
  platform_fee_percentage: { type: Number, min: 0, max: 100, default: 5.0 },
  platform_fee_fixed: { type: Number, min: 0, default: 0 },
  platform_fee_cap: { type: Number, min: 0, default: null },

  primary_agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  primary_agency_commission_type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  primary_agency_commission_rate: { type: Number, min: 0, max: 100, default: 0 },
  primary_agency_commission_fixed: { type: Number, min: 0, default: 0 },

  affiliate_commission_enabled: { type: Boolean, default: true },
  affiliate_commission_type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  affiliate_commission_rate: { type: Number, min: 0, max: 100, default: 0 },
  affiliate_commission_fixed: { type: Number, min: 0, default: 0 },
  affiliate_commission_base: { type: String, enum: ['ticket_price', 'organizer_revenue', 'agency_revenue'], default: 'organizer_revenue' },

  enable_multi_tier: { type: Boolean, default: false },
  tier_2_commission_rate: { type: Number, min: 0, max: 100, default: null },
  tier_3_commission_rate: { type: Number, min: 0, max: 100, default: null },

  attribution_model: { type: String, enum: ['last_click', 'first_click', 'linear', 'time_decay'], default: 'last_click' },
  attribution_window_days: { type: Number, min: 1, default: 30 },
  allow_self_referral: { type: Boolean, default: false },
  allow_duplicate_conversions: { type: Boolean, default: false },

  payout_frequency: { type: String, enum: ['immediate', 'daily', 'weekly', 'monthly', 'manual'], default: 'weekly' },
  payout_delay_days: { type: Number, min: 0, default: 7 },
  minimum_payout_amount: { type: Number, min: 0, default: 50.0 }
}, { timestamps: true });

eventCommissionConfigSchema.index({ event_id: 1 }, { unique: true });
eventCommissionConfigSchema.index({ organizer_id: 1 });

module.exports = mongoose.models.EventCommissionConfig || mongoose.model('EventCommissionConfig', eventCommissionConfigSchema);


