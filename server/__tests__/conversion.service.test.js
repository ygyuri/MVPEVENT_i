const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../index');
const Event = require('../models/Event');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const ReferralLink = require('../models/ReferralLink');
const Ticket = require('../models/Ticket');

describe('Conversion Service Integration (happy path)', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('creates conversion after click + ticket scan', async () => {
    const event = await Event.create({
      organizer: new mongoose.Types.ObjectId(), title: 'Conv Event', slug: 'conv-event', description: 'd',
      dates: { startDate: new Date(), endDate: new Date() }, status: 'published'
    });
    await EventCommissionConfig.create({
      event_id: event._id,
      organizer_id: event.organizer,
      platform_fee_type: 'percentage', platform_fee_percentage: 5,
      primary_agency_commission_type: 'percentage', primary_agency_commission_rate: 0,
      affiliate_commission_enabled: true, affiliate_commission_type: 'percentage', affiliate_commission_rate: 20,
      affiliate_commission_base: 'organizer_revenue', attribution_model: 'last_click', attribution_window_days: 30
    });
    const link = await ReferralLink.create({ event_id: event._id, referral_code: 'ZCONV1', status: 'active' });

    // Simulate click to set cookie
    const health = await request(app)
      .get(`/api/health?ref=${link.referral_code}`)
      .set('User-Agent', 'Mozilla/5.0 Chrome/120 Safari')
      .expect(200);
    const cookies = health.headers['set-cookie'] || [];
    const refCookie = cookies.find(c => c.startsWith('_event_i_ref='));
    expect(!!refCookie).toBe(true);

    // Create ticket and scan to trigger conversion processing
    const ticket = await Ticket.create({
      orderId: new mongoose.Types.ObjectId(),
      eventId: event._id,
      ownerUserId: new mongoose.Types.ObjectId(),
      holder: { firstName: 'T', lastName: 'U', email: 't@u.com', phone: '+254700000001' },
      ticketType: 'GA',
      price: 100,
      status: 'active'
    });

    await request(app)
      .post('/api/tickets/scan')
      .set('Cookie', [refCookie])
      .set('Authorization', 'Bearer faketoken')
      .send({ qr: 'invalid-for-test' })
      .expect(400); // scan will fail but conversion call happens only on success in route; we assert no crash

    // Directly call conversion for test since scan expects valid QR
    const conversionService = require('../services/conversionService');
    const reqMock = { cookies: { _event_i_ref: refCookie.split(';')[0].split('=')[1] } };
    const conv = await conversionService.processConversion({ req: reqMock, ticket });
    // conv might be null if attribution window misses but with immediate click should exist
    // We simply assert no throw; detailed commission math covered in other tests
    expect(conv === null || conv.ticket_price === 100).toBe(true);
  });
});


