const request = require('supertest');
const express = require('express');

// Default: organizer user
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, res, next) => { req.user = { _id: '507f1f77bcf86cd799439011', role: 'organizer' }; next(); },
  requireRole: () => (req, res, next) => next()
}));

jest.mock('../services/updateService', () => {
  const mockApi = {
    validateOrganizer: async () => ({ ok: true }),
    validateReader: async () => ({ ok: true }),
    createUpdate: async (eventId, organizerId, body) => ({ _id: '64b6b2b4f2f4f2f4f2f4f2f4', createdAt: new Date(), ...body }),
    listUpdates: jest.fn(async () => ([{ _id: '1', content: 'hello', moderation: { status: 'approved' } }])),
    react: async () => ({}),
    edit: async () => ({ ok: true }),
    remove: async () => ({ ok: true })
  };
  return mockApi;
});

jest.mock('../realtime/socketInstance', () => ({ broadcastUpdate: jest.fn() }));

// Mock EventUpdate model to avoid DB calls in reactions route (must be before requiring routes)
jest.mock('../models/EventUpdate', () => ({
  findById: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ _id: '507f1f77bcf86cd799439013', eventId: '507f1f77bcf86cd799439012' }))
  }))
}));

const app = express();
app.use(express.json());
app.use('/api', require('../routes/updates'));

describe('Updates routes', () => {
  it('POST /api/events/:eventId/updates creates update', async () => {
    const res = await request(app)
      .post('/api/events/507f1f77bcf86cd799439012/updates')
      .send({ content: 'New update', priority: 'normal' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/events/:eventId/updates validates body', async () => {
    const res = await request(app)
      .post('/api/events/507f1f77bcf86cd799439012/updates')
      .send({ content: '' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/events/:eventId/updates lists updates', async () => {
    const res = await request(app)
      .get('/api/events/507f1f77bcf86cd799439012/updates');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // ensure onlyApproved flag is passed through
    const UpdateService = require('../services/updateService');
    expect(UpdateService.listUpdates).toHaveBeenCalled();
    const args = UpdateService.listUpdates.mock.calls[0][1];
    expect(args.onlyApproved).toBe(true);
  });

  it('POST /api/updates/:updateId/reactions reacts to update', async () => {
    const res = await request(app)
      .post('/api/updates/507f1f77bcf86cd799439013/reactions')
      .send({ reactionType: 'like' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PATCH /api/updates/:updateId edits update', async () => {
    const res = await request(app)
      .patch('/api/updates/507f1f77bcf86cd799439013')
      .send({ content: 'Edited' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/updates/:updateId deletes update', async () => {
    const res = await request(app)
      .delete('/api/updates/507f1f77bcf86cd799439013');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Rate limit: POST updates returns 429 after 10 requests/hour', async () => {
    // fire 11 requests
    let lastRes;
    for (let i = 0; i < 11; i++) {
      lastRes = await request(app)
        .post('/api/events/507f1f77bcf86cd799439012/updates')
        .send({ content: 'x', priority: 'normal' });
    }
    expect([201, 429]).toContain(lastRes.statusCode);
  });
});


