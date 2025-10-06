const mongoose = require('mongoose');

const referralConversionSchema = new mongoose.Schema({
  click_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralClick', required: true },
  link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralLink', required: true },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticket_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },

  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  attribution_model_used: { type: String, enum: ['last_click', 'first_click', 'linear'], default: 'last_click' },
  attributed_clicks: { type: mongoose.Schema.Types.Mixed },

  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer_email: { type: String, trim: true, maxlength: 255 },

  ticket_price: { type: Number, required: true, min: 0 },
  platform_fee: { type: Number, required: true, min: 0 },
  organizer_revenue: { type: Number, required: true, min: 0 },
  primary_agency_commission: { type: Number, required: true, min: 0 },
  affiliate_commission: { type: Number, required: true, min: 0 },
  tier_2_affiliate_commission: { type: Number, min: 0, default: null },
  organizer_net: { type: Number, required: true, min: 0 },

  commission_config_snapshot: { type: mongoose.Schema.Types.Mixed },
  calculation_breakdown: { type: mongoose.Schema.Types.Mixed },

  conversion_status: { type: String, enum: ['pending', 'confirmed', 'refunded', 'disputed'], default: 'pending' },
  is_fraudulent: { type: Boolean, default: false },
  fraud_reason: { type: String, default: null },

  affiliate_payout_status: { type: String, enum: ['pending', 'scheduled', 'paid', 'failed'], default: 'pending' },
  affiliate_payout_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliatePayout', default: null },
  agency_payout_status: { type: String, enum: ['pending', 'scheduled', 'paid', 'failed'], default: 'pending' },
  agency_payout_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliatePayout', default: null },

  converted_at: { type: Date, default: Date.now },
  confirmed_at: { type: Date, default: null },
  refunded_at: { type: Date, default: null }
}, { timestamps: true });

referralConversionSchema.index({ affiliate_id: 1, converted_at: 1 });
referralConversionSchema.index({ agency_id: 1, converted_at: 1 });
referralConversionSchema.index({ event_id: 1, converted_at: 1 });
referralConversionSchema.index({ conversion_status: 1, affiliate_payout_status: 1 });

module.exports = mongoose.models.ReferralConversion || mongoose.model('ReferralConversion', referralConversionSchema);


