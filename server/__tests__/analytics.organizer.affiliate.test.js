const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');

function tokenFor(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
}

async function seedSession(userId, token) {
  const expires = new Date(Date.now() + 3600000);
  await Session.create({ userId, sessionToken: token, refreshToken: token + '.r', expiresAt: expires, isActive: true });
}

describe('Organizer Affiliate Analytics Endpoints', () => {
  let organizer;
  let token;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
    organizer = await User.create({ email: 'orgaff@example.com', username: 'orgaff', firstName: 'O', lastName: 'G', role: 'organizer' });
    token = tokenFor(organizer._id);
    await seedSession(organizer._id, token);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('affiliate-performance returns data', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics/affiliate-performance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  test('agency-comparison returns data', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics/agency-comparison')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });
});


