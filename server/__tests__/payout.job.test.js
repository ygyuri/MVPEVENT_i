const mongoose = require('mongoose');
const { calculatePendingPayouts } = require('../jobs/calculatePayouts');
const Event = require('../models/Event');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const ReferralConversion = require('../models/ReferralConversion');
const AffiliatePayout = require('../models/AffiliatePayout');

describe('Payout Calculation Job', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('schedules payouts for eligible conversions', async () => {
    const organizer = new mongoose.Types.ObjectId();
    const event = await Event.create({ organizer, title: 'Payout Event', slug: 'payout-event', description: 'd', dates: { startDate: new Date(), endDate: new Date() }, status: 'published' });
    await EventCommissionConfig.create({ event_id: event._id, organizer_id: organizer, minimum_payout_amount: 10, payout_delay_days: 1 });
    const aff = new mongoose.Types.ObjectId();
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await ReferralConversion.create({
      click_id: new mongoose.Types.ObjectId(), link_id: new mongoose.Types.ObjectId(), event_id: event._id, ticket_id: new mongoose.Types.ObjectId(),
      affiliate_id: aff, agency_id: null, attribution_model_used: 'last_click', attributed_clicks: [], customer_id: new mongoose.Types.ObjectId(), customer_email: 'x@y.com',
      ticket_price: 100, platform_fee: 5, organizer_revenue: 95, primary_agency_commission: 0, affiliate_commission: 15, organizer_net: 80,
      conversion_status: 'confirmed', affiliate_payout_status: 'pending', converted_at: old
    });

    const created = await calculatePendingPayouts({ now: new Date() });
    expect(created.length).toBeGreaterThanOrEqual(1);
    const scheduled = await AffiliatePayout.find({ payout_status: 'scheduled' });
    expect(scheduled.length).toBeGreaterThanOrEqual(1);
  });
});


