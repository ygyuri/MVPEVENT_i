const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const Event = require('../models/Event');
const ReferralLink = require('../models/ReferralLink');

describe('Referral Click Tracking Middleware', () => {
  let event;
  let link;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
    event = await Event.create({
      organizer: new mongoose.Types.ObjectId(), title: 'Click Event', slug: 'click-event', description: 'd',
      dates: { startDate: new Date(), endDate: new Date() }, status: 'published'
    });
    link = await ReferralLink.create({ event_id: event._id, referral_code: 'CLICK123', status: 'active' });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('sets cookie on referral click', async () => {
    const res = await request(app)
      .get(`/api/health?ref=${encodeURIComponent(link.referral_code)}`)
      .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'] || [];
    const found = setCookie.find(c => c.includes('_event_i_ref='));
    expect(!!found).toBe(true);
  });
});


