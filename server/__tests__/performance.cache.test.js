const mongoose = require('mongoose');
const { runRefresh } = require('../jobs/refreshPerformanceCache');
const ReferralClick = require('../models/ReferralClick');
const ReferralConversion = require('../models/ReferralConversion');
const AffiliatePerformanceCache = require('../models/AffiliatePerformanceCache');

describe('Affiliate Performance Cache Refresh', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('runRefresh populates today cache', async () => {
    const aff = new mongoose.Types.ObjectId();
    await ReferralClick.create({ link_id: new mongoose.Types.ObjectId(), event_id: new mongoose.Types.ObjectId(), affiliate_id: aff, visitor_id: 'v1', user_agent: 'ua', landing_page_url: '/', country: 'KE', device_type: 'mobile', browser: 'chrome', os: 'android' });
    await ReferralConversion.create({ click_id: new mongoose.Types.ObjectId(), link_id: new mongoose.Types.ObjectId(), event_id: new mongoose.Types.ObjectId(), ticket_id: new mongoose.Types.ObjectId(), affiliate_id: aff, ticket_price: 100, platform_fee: 5, organizer_revenue: 95, primary_agency_commission: 0, affiliate_commission: 10, organizer_net: 85, conversion_status: 'confirmed' });

    await runRefresh();
    const rows = await AffiliatePerformanceCache.find({ affiliate_id: aff, time_period: 'today' });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});


