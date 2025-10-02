const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  verifyToken: (req, res, next) => { req.user = { _id: '507f1f77bcf86cd799439011' }; next(); }
}));

jest.mock('../models/DeviceToken', () => ({
  updateOne: jest.fn(async () => ({}))
}));
jest.mock('../models/WebPushSubscription', () => ({
  create: jest.fn(async () => ({}))
}));

const app = express();
app.use(express.json());
app.use('/api/push', require('../routes/push'));

describe('Push registration', () => {
  it('registers device token', async () => {
    const res = await request(app)
      .post('/api/push/register-device')
      .send({ platform: 'web', token: 'device-1234567890' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects invalid platform', async () => {
    const res = await request(app)
      .post('/api/push/register-device')
      .send({ platform: 'x', token: 'device-1234567890' });
    expect(res.statusCode).toBe(400);
  });

  it('registers web push subscription', async () => {
    const res = await request(app)
      .post('/api/push/register-webpush')
      .send({ subscription: { endpoint: 'https://example.com', keys: { p256dh: 'x', auth: 'y' } } });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


