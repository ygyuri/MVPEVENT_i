const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

const MarketingAgency = require('../models/MarketingAgency');
const AffiliateMarketer = require('../models/AffiliateMarketer');

describe('Affiliates Routes', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('self-service signup rejects disposable email', async () => {
    const res = await request(app)
      .post('/api/affiliates/signup')
      .send({ first_name: 'Test', last_name: 'User', email: 'foo@mailinator.com' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('agency create affiliate requires auth', async () => {
    const res = await request(app)
      .post('/api/agency/affiliates')
      .send({ agency_id: new mongoose.Types.ObjectId().toString(), first_name: 'A', last_name: 'B', email: 'a@example.com' });
    expect([401,403]).toContain(res.status);
  });
});


