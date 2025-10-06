const request = require('supertest');
const mongoose = require('mongoose');
const app = require('..');
const User = require('../models/User');
const Session = require('../models/Session');

describe('Authentication flow (JWT) integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (!mongoose.connection.readyState) {
      const { connectMongoDB } = require('../config/database');
      await connectMongoDB();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('registers, logs in, gets /api/auth/me, and fetches organizer events', async () => {
    // Register organizer
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'organizer@example.com',
        password: 'password123',
        username: 'orguser',
        firstName: 'Org',
        lastName: 'User',
        role: 'organizer'
      })
      .expect(201);

    expect(registerRes.body.tokens).toBeDefined();
    const { accessToken } = registerRes.body.tokens;

    // /me should succeed
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.user.email).toBe('organizer@example.com');

    // organizer events should be authorized (empty list)
    const eventsRes = await request(app)
      .get('/api/organizer/events?page=1&pageSize=6&sort=createdAt&order=desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(eventsRes.body).toHaveProperty('success', true);
    expect(eventsRes.body.data).toHaveProperty('items');
  });
});


