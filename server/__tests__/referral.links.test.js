const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const AffiliateMarketer = require('../models/AffiliateMarketer');

function makeAuth(userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
  return token;
}

async function createSession(userId, token) {
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await Session.create({ userId, sessionToken: token, refreshToken: token + '.r', expiresAt: expires, isActive: true });
}

describe('Referral Links', () => {
  let affiliateUser;
  let affiliate;
  let event;
  let token;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i_test';
    await mongoose.connect(uri);
    affiliateUser = await User.create({
      email: 'aff@example.com', username: 'affiliate1', firstName: 'Aff', lastName: 'User', role: 'affiliate'
    });
    affiliate = await AffiliateMarketer.create({
      user_id: affiliateUser._id, first_name: 'Aff', last_name: 'User', email: 'aff@example.com', referral_code: 'AFFCODE1', status: 'active'
    });
    event = await Event.create({
      organizer: new mongoose.Types.ObjectId(), title: 'Ref Test', slug: 'ref-test', description: 'd',
      dates: { startDate: new Date(), endDate: new Date() }, status: 'published'
    });
    token = makeAuth(affiliateUser._id);
    await createSession(affiliateUser._id, token);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test('create, list, preview, shorten, update, delete flow', async () => {
    const createRes = await request(app)
      .post(`/api/events/${event._id}/referral-links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ affiliateId: affiliate._id.toString(), utm: { source: 'instagram' }, campaign_name: 'IG' });
    expect(createRes.status).toBe(201);
    const linkId = createRes.body.link._id;

    const listRes = await request(app)
      .get('/api/affiliates/referral-links')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.links)).toBe(true);

    const previewRes = await request(app)
      .get(`/api/referral-links/${linkId}/preview`)
      .set('Authorization', `Bearer ${token}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview.url).toContain('/events/ref-test');

    const shortRes = await request(app)
      .post(`/api/referral-links/${linkId}/shorten`)
      .set('Authorization', `Bearer ${token}`);
    expect(shortRes.status).toBe(200);
    expect(typeof shortRes.body.short).toBe('string');

    const patchRes = await request(app)
      .patch(`/api/referral-links/${linkId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paused' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.link.status).toBe('paused');

    const delRes = await request(app)
      .delete(`/api/referral-links/${linkId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);
  });
});


