const AffiliateMarketer = require('../models/AffiliateMarketer');
const AffiliatePayout = require('../models/AffiliatePayout');

class PayoutService {
  // Enforce KYC for high-volume affiliates before scheduling/processing payouts
  async canScheduleAffiliatePayout(affiliateId, amountUsd) {
    const aff = await AffiliateMarketer.findById(affiliateId);
    if (!aff) return { ok: false, code: 'AFFILIATE_NOT_FOUND' };
    const requiresKyc = aff.kyc_required || (aff.annual_volume_usd || 0) > 10000;
    if (requiresKyc && aff.kyc_status !== 'approved') {
      return { ok: false, code: 'KYC_REQUIRED' };
    }
    if ((aff.minimum_payout_threshold || 0) > amountUsd) {
      return { ok: false, code: 'BELOW_MIN_THRESHOLD' };
    }
    return { ok: true };
  }
}

module.exports = new PayoutService();


