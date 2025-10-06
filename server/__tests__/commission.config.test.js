const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const Event = require('../models/Event');
const User = require('../models/User');

describe('Commission Config Routes', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('preview requires auth', async () => {
    const eventId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/events/${eventId}/commission-config/preview`)
      .send({ ticket_price: 100 });
    expect([401,403]).toContain(res.status);
  });
});


