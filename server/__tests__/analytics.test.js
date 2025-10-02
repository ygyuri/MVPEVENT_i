const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const { connectMongoDB } = require('../config/database');

jest.setTimeout(20000);
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const analyticsService = require('../services/analyticsService');

describe('Analytics API', () => {
  let organizerToken;
  let adminToken;
  let testEvent;
  let testOrder;
  let testTicket;

  beforeAll(async () => {
    await connectMongoDB();
    // Create test organizer
    const organizer = new User({
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer',
      username: 'testorganizer',
      firstName: 'Org',
      lastName: 'User'
    });
    await organizer.save();
    
    // Create test admin
    const admin = new User({
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      username: 'testadmin',
      firstName: 'Admin',
      lastName: 'User'
    });
    await admin.save();

    // Login organizer
    const organizerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'organizer@test.com',
        password: 'password123'
      });
    organizerToken = organizerLogin.body.token;

    // Login admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;

    // Create test event
    testEvent = new Event({
      organizer: organizer._id,
      title: 'Test Analytics Event',
      description: 'Event for testing analytics',
      dates: {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-02')
      },
      status: 'published',
      slug: 'test-analytics-event',
      ticketTypes: [
        { name: 'VIP', price: 100, quantity: 50 },
        { name: 'General', price: 50, quantity: 100 }
      ]
    });
    await testEvent.save();

    // Create test order
    testOrder = new Order({
      customer: {
        userId: organizer._id,
        email: 'customer@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+254712345678'
      },
      items: [{
        eventId: testEvent._id,
        eventTitle: testEvent.title,
        ticketType: 'VIP',
        quantity: 2,
        unitPrice: 100,
        subtotal: 200
      }],
      pricing: {
        subtotal: 200,
        serviceFee: 10,
        total: 210,
        currency: 'KES'
      },
      payment: {
        method: 'mpesa',
        status: 'completed'
      },
      status: 'paid'
    });
    await testOrder.save();

    // Create test ticket
    testTicket = new Ticket({
      orderId: testOrder._id,
      eventId: testEvent._id,
      ownerUserId: organizer._id,
      holder: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'customer@test.com',
        phone: '+254712345678'
      },
      ticketType: 'VIP',
      price: 100,
      status: 'active',
      ticketNumber: 'TKT-001'
    });
    await testTicket.save();
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({ email: { $in: ['organizer@test.com', 'admin@test.com'] } });
    await Event.deleteMany({ title: 'Test Analytics Event' });
    await Order.deleteMany({ 'customer.email': 'customer@test.com' });
    await Ticket.deleteMany({ 'holder.email': 'customer@test.com' });
    await mongoose.connection.close();
  });

  describe('GET /api/organizer/analytics/dashboard-overview', () => {
    it('should return dashboard overview for organizer', async () => {
      const response = await request(app)
        .get('/api/organizer/analytics/dashboard-overview')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eventsCount');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalTicketsSold');
      expect(response.body.data).toHaveProperty('upcomingEvents');
      expect(response.body.data).toHaveProperty('recentSales');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/organizer/analytics/dashboard-overview')
        .expect(401);
    });
  });

  describe('GET /api/organizer/analytics/sales-chart/:eventId', () => {
    it('should return sales chart data for event', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/sales-chart/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('chartData');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('period');
    });

    it('should return sales chart with filters', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/sales-chart/${testEvent._id}`)
        .query({
          period: 'daily',
          ticketType: 'VIP'
        })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('daily');
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/organizer/analytics/sales-chart/${fakeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Create another organizer
      const otherOrganizer = new User({
        email: 'other@test.com',
        password: 'password123',
        role: 'organizer',
        username: 'otherorganizer',
        firstName: 'Other',
        lastName: 'User'
      });
      await otherOrganizer.save();

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@test.com',
          password: 'password123'
        });

      await request(app)
        .get(`/api/organizer/analytics/sales-chart/${testEvent._id}`)
        .set('Authorization', `Bearer ${otherLogin.body.token}`)
        .expect(403);

      await User.deleteOne({ _id: otherOrganizer._id });
    });
  });

  describe('GET /api/organizer/analytics/revenue-overview/:eventId', () => {
    it('should return revenue overview for event', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/revenue-overview/${testEvent._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('netRevenue');
      expect(response.body.data).toHaveProperty('paymentMethods');
      expect(response.body.data).toHaveProperty('refunds');
    });

    it('should allow admin access', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/revenue-overview/${testEvent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/organizer/analytics/revenue-trends', () => {
    it('should return revenue trends', async () => {
      const response = await request(app)
        .get('/api/organizer/analytics/revenue-trends')
        .query({
          period: 'monthly',
          eventIds: JSON.stringify([testEvent._id])
        })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('eventBreakdown');
    });
  });

  describe('GET /api/organizer/analytics/export/attendees/:eventId', () => {
    it('should export attendees as JSON', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/export/attendees/${testEvent._id}`)
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('format');
    });

    it('should export attendees with filters', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/export/attendees/${testEvent._id}`)
        .query({
          format: 'json',
          status: 'active',
          ticketType: 'VIP'
        })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.status).toBe('active');
      expect(response.body.data.filters.ticketType).toBe('VIP');
    });
  });

  describe('POST /api/organizer/analytics/export/attendees/:eventId', () => {
    it('should create export job', async () => {
      const response = await request(app)
        .post(`/api/organizer/analytics/export/attendees/${testEvent._id}`)
        .send({
          format: 'csv',
          filters: { status: 'active' },
          fields: ['ticketNumber', 'holder.firstName', 'holder.lastName']
        })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('format');
      expect(response.body.data).toHaveProperty('totalRecords');
    });
  });

  describe('GET /api/organizer/analytics/events/:eventId/summary', () => {
    it('should return event summary', async () => {
      const response = await request(app)
        .get(`/api/organizer/analytics/events/${testEvent._id}/summary`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sales');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('lastUpdated');
    });
  });

  describe('Analytics Service Unit Tests', () => {
    it('should get sales chart data', async () => {
      const result = await analyticsService.getSalesChart(testEvent._id, {
        period: 'daily'
      });

      expect(result).toHaveProperty('chartData');
      expect(result).toHaveProperty('summary');
      expect(result.period).toBe('daily');
    });

    it('should get revenue overview', async () => {
      const result = await analyticsService.getRevenueOverview(testEvent._id);

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('netRevenue');
      expect(result).toHaveProperty('paymentMethods');
    });

    it('should export attendees', async () => {
      const result = await analyticsService.exportAttendees(testEvent._id, {
        format: 'json'
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('format');
    });

    it('should get dashboard overview', async () => {
      const result = await analyticsService.getDashboardOverview(testEvent.organizer);

      expect(result).toHaveProperty('eventsCount');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalTicketsSold');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event ID format', async () => {
      await request(app)
        .get('/api/organizer/analytics/sales-chart/invalid-id')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(400);
    });

    it('should handle invalid query parameters', async () => {
      await request(app)
        .get(`/api/organizer/analytics/sales-chart/${testEvent._id}`)
        .query({ period: 'invalid' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post(`/api/organizer/analytics/export/attendees/${testEvent._id}`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(400);
    });
  });
});


