const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'u1', role: 'customer', email: 'u1@example.com' };
    next();
  }
}));

// Mock queue monitor
jest.mock('../services/queue/reminderQueue', () => ({
  reminderQueue: { getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0 }) }
}));

// Mock ReminderService methods used by routes
jest.mock('../services/reminderService', () => ({
  scheduleForTickets: jest.fn(async () => ({ scheduled: 3 })),
  listUpcomingByUser: jest.fn(async () => ([{ id: 'r1', scheduledTime: new Date().toISOString() }])),
  updatePreferences: jest.fn(async () => ({ id: 'r1', deliveryMethod: 'sms', userId: 'u1' }))
}));

// Mock Reminder model for delete route
jest.mock('../models/Reminder', () => ({
  findById: jest.fn(async () => ({ userId: 'u1', status: 'pending', save: jest.fn(async () => ({})) }))
}));

const remindersRouter = require('../routes/reminders');

const app = express();
app.use(express.json());
app.use('/api/reminders', remindersRouter);

describe('Reminders API', () => {
  it('POST /api/reminders/schedule schedules for paid orders', async () => {
    const res = await request(app)
      .post('/api/reminders/schedule')
      .send({ order: { status: 'paid', _id: 'ord1' } });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scheduled).toBe(3);
  });

  it('GET /api/reminders/user/:userId returns upcoming reminders', async () => {
    const res = await request(app).get('/api/reminders/user/u1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('PATCH /api/reminders/:id/preferences updates delivery method', async () => {
    const res = await request(app)
      .patch('/api/reminders/r1/preferences')
      .send({ deliveryMethod: 'sms' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deliveryMethod).toBe('sms');
  });

  it('DELETE /api/reminders/:id cancels reminder', async () => {
    const res = await request(app).delete('/api/reminders/r1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/reminders/_monitor returns job counts (stub)', async () => {
    const res = await request(app).get('/api/reminders/_monitor');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('waiting');
  });
});




