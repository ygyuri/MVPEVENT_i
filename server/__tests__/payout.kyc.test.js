const mongoose = require('mongoose');
const payoutService = require('../services/payoutService');
const AffiliateMarketer = require('../models/AffiliateMarketer');

describe('Payout KYC enforcement', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('requires KYC when annual volume exceeds $10k', async () => {
    const aff = await AffiliateMarketer.create({
      first_name: 'High', last_name: 'Volume', email: 'hv@example.com', referral_code: 'HV12345',
      annual_volume_usd: 15000, kyc_status: 'pending', status: 'active'
    });
    const chk = await payoutService.canScheduleAffiliatePayout(aff._id, 200);
    expect(chk.ok).toBe(false);
    expect(chk.code).toBe('KYC_REQUIRED');
  });
});


