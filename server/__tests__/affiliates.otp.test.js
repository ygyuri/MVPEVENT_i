const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

describe('Affiliate OTP Verification', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('request OTP returns ok (with debugCode if SMS not configured)', async () => {
    const res = await request(app)
      .post('/api/affiliates/phone/request-otp')
      .send({ phone: '+254700000099' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('verify OTP fails with wrong code', async () => {
    // First request to set code
    const req1 = await request(app)
      .post('/api/affiliates/phone/request-otp')
      .send({ phone: '+254700000088' });
    const fallbackCode = req1.body.debugCode || '000000';
    const wrong = fallbackCode === '123456' ? '000000' : '123456';
    const res = await request(app)
      .post('/api/affiliates/phone/verify-otp')
      .send({ phone: '+254700000088', code: wrong });
    expect(res.status).toBe(400);
  });
});


