const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');

function makeAuth(userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
  return token;
}

async function createSession(userId, token) {
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await Session.create({ userId, sessionToken: token, refreshToken: token + '.r', expiresAt: expires, isActive: true });
}

describe('Commission Example 1 Breakdown', () => {
  let organizer;
  let event;
  let token;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
    organizer = await User.create({
      email: 'org@example.com',
      username: 'organizer1',
      firstName: 'Org',
      lastName: 'User',
      role: 'organizer'
    });
    event = await Event.create({
      organizer: organizer._id,
      title: 'Test Event',
      slug: 'test-event',
      description: 'desc',
      dates: { startDate: new Date(), endDate: new Date() },
      status: 'published'
    });
    token = makeAuth(organizer._id);
    await createSession(organizer._id, token);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('Set config and preview matches $100 -> $5, $95, $38, $19, $38', async () => {
    // Set config
    const setRes = await request(app)
      .post(`/api/events/${event._id}/commission-config`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform_fee_type: 'percentage',
        platform_fee_percentage: 5,
        primary_agency_commission_type: 'percentage',
        primary_agency_commission_rate: 40,
        affiliate_commission_enabled: true,
        affiliate_commission_type: 'percentage',
        affiliate_commission_rate: 20,
        affiliate_commission_base: 'organizer_revenue'
      });
    expect(setRes.status).toBe(201);

    const prev = await request(app)
      .post(`/api/events/${event._id}/commission-config/preview`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ticket_price: 100 });
    expect(prev.status).toBe(200);
    const b = prev.body.breakdown;
    expect(b.platform_fee).toBe(5);
    expect(b.organizer_revenue).toBe(95);
    expect(b.primary_agency_commission).toBe(38);
    expect(b.affiliate_commission).toBe(19);
    expect(b.organizer_net).toBe(38);
  });
});


