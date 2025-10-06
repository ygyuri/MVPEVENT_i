const mongoose = require('mongoose');

const referralClickSchema = new mongoose.Schema({
  link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralLink', required: true },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },

  visitor_id: { type: String, required: true, trim: true, maxlength: 100 },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip_address: { type: String },
  user_agent: { type: String },
  referrer_url: { type: String },
  landing_page_url: { type: String, required: true },

  country: { type: String, trim: true, maxlength: 2 },
  region: { type: String, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 100 },

  device_type: { type: String, enum: ['mobile', 'tablet', 'desktop'] },
  browser: { type: String, trim: true, maxlength: 100 },
  os: { type: String, trim: true, maxlength: 100 },

  clicked_at: { type: Date, default: Date.now },
  converted: { type: Boolean, default: false },
  conversion_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralConversion', default: null }
});

referralClickSchema.index({ link_id: 1 });
referralClickSchema.index({ visitor_id: 1 });
referralClickSchema.index({ converted: 1, clicked_at: 1 });
referralClickSchema.index({ event_id: 1, clicked_at: 1 });

module.exports = mongoose.models.ReferralClick || mongoose.model('ReferralClick', referralClickSchema);


