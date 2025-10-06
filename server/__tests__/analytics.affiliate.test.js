const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');
const ReferralConversion = require('../models/ReferralConversion');

function tokenFor(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
}

async function seedSession(userId, token) {
  const expires = new Date(Date.now() + 3600000);
  await Session.create({ userId, sessionToken: token, refreshToken: token + '.r', expiresAt: expires, isActive: true });
}

describe('Affiliate Analytics Endpoints', () => {
  let affiliateUser;
  let token;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
    affiliateUser = await User.create({ email: 'affdash@example.com', username: 'affdash', firstName: 'A', lastName: 'B', role: 'affiliate' });
    token = tokenFor(affiliateUser._id);
    await seedSession(affiliateUser._id, token);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('overview returns expected shape', async () => {
    const res = await request(app)
      .get('/api/affiliates/dashboard/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
  });

  test('performance returns buckets', async () => {
    const res = await request(app)
      .get('/api/affiliates/dashboard/performance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('time_buckets');
  });
});


