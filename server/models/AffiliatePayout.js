const mongoose = require('mongoose');

const affiliatePayoutSchema = new mongoose.Schema({
  payout_type: { type: String, enum: ['affiliate', 'agency'], required: true },
  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  payout_period_start: { type: Date, required: true },
  payout_period_end: { type: Date, required: true },
  total_conversions: { type: Number, default: 0 },
  total_revenue_generated: { type: Number, default: 0 },
  gross_commission: { type: Number, required: true, min: 0 },
  deductions: { type: Number, default: 0, min: 0 },
  net_payout_amount: { type: Number, required: true, min: 0 },

  payment_method: { type: String, enum: ['bank_transfer', 'paypal', 'stripe', 'crypto'] },
  payment_details: { type: mongoose.Schema.Types.Mixed },
  payment_reference: { type: String, default: null },

  payout_status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  scheduled_at: { type: Date, default: null },
  processed_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  failed_at: { type: Date, default: null },
  failure_reason: { type: String, default: null },

  conversion_ids: { type: [mongoose.Schema.Types.ObjectId], ref: 'ReferralConversion', default: [] },
  invoice_url: { type: String, default: null }
}, { timestamps: true });

affiliatePayoutSchema.index({ affiliate_id: 1, payout_status: 1 });
affiliatePayoutSchema.index({ agency_id: 1, payout_status: 1 });
affiliatePayoutSchema.index({ payout_status: 1, scheduled_at: 1 });

module.exports = mongoose.models.AffiliatePayout || mongoose.model('AffiliatePayout', affiliatePayoutSchema);


