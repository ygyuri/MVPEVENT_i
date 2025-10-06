const mongoose = require('mongoose');

const fraudDetectionLogSchema = new mongoose.Schema({
  detection_type: { type: String, enum: ['self_referral', 'duplicate_ip', 'suspicious_pattern', 'bot_traffic', 'rapid_conversions'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },

  affiliate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateMarketer', default: null },
  agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAgency', default: null },
  click_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralClick', default: null },
  conversion_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralConversion', default: null },

  fraud_indicators: { type: mongoose.Schema.Types.Mixed },
  risk_score: { type: Number, min: 0, max: 100, default: 0 },

  action_taken: { type: String, enum: ['flagged', 'blocked', 'manual_review', 'ignored'], default: 'flagged' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  review_notes: { type: String, default: null },
  resolved_at: { type: Date, default: null },

  detected_at: { type: Date, default: Date.now }
}, { timestamps: true });

fraudDetectionLogSchema.index({ affiliate_id: 1, severity: 1 });
fraudDetectionLogSchema.index({ action_taken: 1, detected_at: 1 });

module.exports = mongoose.models.FraudDetectionLog || mongoose.model('FraudDetectionLog', fraudDetectionLogSchema);


