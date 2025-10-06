const mongoose = require('mongoose');

const affiliateMarketerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  first_name: { type: String, required: true, trim: true, maxlength: 100 },
  last_name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 255 },
  phone: { type: String, trim: true, maxlength: 20 },
  phone_verified: { type: Boolean, default: false },
  referral_code: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
  affiliate_tier: { type: String, enum: ['tier_1', 'tier_2', 'tier_3'], default: 'tier_1' },
  parent_affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  payment_method: { type: String, enum: ['bank_transfer', 'paypal', 'stripe', 'crypto'] },
  payment_details: { type: mongoose.Schema.Types.Mixed },
  minimum_payout_threshold: { type: Number, default: 50.0, min: 0 },
  // KYC/Compliance
  kyc_status: { type: String, enum: ['not_required', 'pending', 'approved', 'rejected'], default: 'not_required' },
  kyc_required: { type: Boolean, default: false },
  annual_volume_usd: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'suspended', 'pending_approval', 'banned'], default: 'pending_approval' },
  deleted_at: { type: Date, default: null }
}, { timestamps: true });

affiliateMarketerSchema.index({ email: 1 }, { unique: true });
affiliateMarketerSchema.index({ referral_code: 1 }, { unique: true });
affiliateMarketerSchema.index({ agency_id: 1, status: 1 });
affiliateMarketerSchema.index({ parent_affiliate_id: 1 });

module.exports = mongoose.models.AffiliateMarketer || mongoose.model('AffiliateMarketer', affiliateMarketerSchema);


