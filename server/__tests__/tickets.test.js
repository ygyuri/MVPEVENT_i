const request = require('supertest');
const express = require('express');

// Minimal app wiring for route testing
const app = express();
app.use(express.json());
app.use('/api/tickets', require('../routes/tickets'));

describe('Tickets API basic wiring', () => {
  it('GET /api/tickets/my should require auth', async () => {
    const res = await request(app).get('/api/tickets/my');
    expect([401, 403]).toContain(res.statusCode);
  });
});


