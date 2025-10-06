const mongoose = require('mongoose');

const referralLinkSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  referral_code: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
  campaign_name: { type: String, trim: true, maxlength: 200 },
  utm_source: { type: String, trim: true, maxlength: 100 },
  utm_medium: { type: String, trim: true, maxlength: 100 },
  utm_campaign: { type: String, trim: true, maxlength: 100 },
  utm_content: { type: String, trim: true, maxlength: 200 },
  custom_landing_page_url: { type: String },
  short_url: { type: String, trim: true, unique: true, sparse: true, maxlength: 100 },
  status: { type: String, enum: ['active', 'paused', 'expired'], default: 'active' },
  expires_at: { type: Date, default: null },
  max_uses: { type: Number, min: 0, default: null },
  current_uses: { type: Number, min: 0, default: 0 },
  deleted_at: { type: Date, default: null }
}, { timestamps: true });

referralLinkSchema.index({ referral_code: 1 }, { unique: true });
referralLinkSchema.index({ event_id: 1, status: 1 });
referralLinkSchema.index({ affiliate_id: 1 });
referralLinkSchema.index({ agency_id: 1 });

module.exports = mongoose.models.ReferralLink || mongoose.model('ReferralLink', referralLinkSchema);


