/**
 * E2E test for voucher feature.
 * Verifies: entry scan → voucher scan → stats, and error cases (NOT_ENTRY_USED, VOUCHER_ALREADY_REDEEMED, NO_VOUCHER_CONFIGURED).
 *
 * Requires: MongoDB + Redis (e.g. via `docker compose up`).
 * In Docker: docker compose exec -e NODE_ENV=test server npm test -- --testPathPattern=vouchers.e2e --runInBand
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('..');
const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const ScanLog = require('../models/ScanLog');
const ticketService = require('../services/ticketService');
const orderService = require('../services/orderService');

const TICKET_TYPE_VIP = 'VIP';
const TICKET_TYPE_STANDARD = 'Standard';
const VOUCHER_AMOUNT_VIP = 500;
const VOUCHER_AMOUNT_STANDARD = 200;

describe('Voucher feature E2E', () => {
  let organizerUser;
  let accessToken;
  let eventId;
  let orderId;
  let ticketId;
  let qrString;

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
      Event.deleteMany({}),
      Order.deleteMany({}),
      Ticket.deleteMany({}),
      ScanLog.deleteMany({}),
    ]);

    organizerUser = null;
    accessToken = null;
    eventId = null;
    orderId = null;
    ticketId = null;
    qrString = null;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  async function registerOrganizer() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'voucher-org@test.com',
        password: 'password123',
        username: 'voucherorg',
        firstName: 'Voucher',
        lastName: 'Organizer',
        role: 'organizer',
      })
      .expect(201);
    expect(res.body.tokens).toBeDefined();
    accessToken = res.body.tokens.accessToken;
    organizerUser = res.body.user;
    return { accessToken, user: organizerUser };
  }

  async function createEventWithVouchers() {
    const createRes = await request(app)
      .post('/api/organizer/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Voucher Test Event',
        description: 'Event for voucher E2E test',
        shortDescription: 'Test event',
        dates: {
          startDate: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
          endDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h from now
          timezone: 'UTC',
        },
        pricing: { price: 0, currency: 'KES', isFree: true },
        ticketTypes: [
          { name: TICKET_TYPE_VIP, price: 1000, quantity: 10, voucherAmount: VOUCHER_AMOUNT_VIP },
          { name: TICKET_TYPE_STANDARD, price: 500, quantity: 50, voucherAmount: VOUCHER_AMOUNT_STANDARD },
        ],
        location: { city: 'Nairobi', country: 'Kenya' },
      })
      .expect(201);

    eventId = createRes.body.data.id;
    const event = await Event.findById(eventId);
    event.status = 'published';
    await event.save();

    return eventId;
  }

  async function createTicket(ticketType = TICKET_TYPE_VIP) {
    const event = await Event.findById(eventId).lean();
    const subtotal = 500;
    const serviceFee = orderService.calculateServiceFee(subtotal);
    const total = orderService.calculateTotal(subtotal, serviceFee);

    const order = new Order({
      customer: {
        userId: organizerUser.id || organizerUser._id,
        email: 'attendee@test.com',
        firstName: 'Attendee',
        lastName: 'Test',
        phone: '+254700000000',
      },
      customerInfo: {
        email: 'attendee@test.com',
        firstName: 'Attendee',
        lastName: 'Test',
        phone: '+254700000000',
      },
      items: [{
        eventId,
        eventTitle: event.title,
        ticketType,
        quantity: 1,
        unitPrice: 500,
        subtotal: 500,
      }],
      pricing: { subtotal, serviceFee, total, currency: 'KES' },
      totalAmount: total,
      status: 'paid',
      paymentStatus: 'completed',
      payment: {
        status: 'completed',
        method: 'payhero',
        paidAt: new Date(),
        mpesaReceiptNumber: `TEST-${Date.now()}`,
      },
      purchaseSource: 'direct_checkout',
    });
    await order.save();
    orderId = order._id;

    const tickets = await orderService.createTickets(order);
    const ticket = tickets[0];
    ticketId = ticket._id;

    // Ensure validity window covers now (voucher/entry scan checks validFrom/validUntil)
    const now = new Date();
    const validFrom = new Date(now.getTime() - 60 * 60 * 1000);
    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    ticket.metadata = ticket.metadata || {};
    ticket.metadata.validFrom = validFrom;
    ticket.metadata.validUntil = validUntil;
    await ticket.save();

    const { qr } = await ticketService.issueQr(ticketId);
    qrString = qr;
    return { ticketId, qrString, orderId };
  }

  it('full flow: create event with vouchers, entry scan, voucher scan, and stats', async () => {
    await registerOrganizer();
    await createEventWithVouchers();
    await createTicket(TICKET_TYPE_VIP);

    // 1. Entry scan
    const entryRes = await request(app)
      .post('/api/tickets/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(200);

    expect(entryRes.body.success).toBe(true);
    expect(entryRes.body.valid).toBe(true);
    expect(entryRes.body.status).toBe('used');

    // 2. Voucher scan (first time - should succeed)
    const voucherRes = await request(app)
      .post('/api/vouchers/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(200);

    expect(voucherRes.body.success).toBe(true);
    expect(voucherRes.body.valid).toBe(true);
    expect(voucherRes.body.voucherAmount).toBe(VOUCHER_AMOUNT_VIP);
    expect(voucherRes.body.currency).toBe('KES');
    expect(voucherRes.body.ticketType).toBe(TICKET_TYPE_VIP);

    // 3. Voucher scan again - should fail (VOUCHER_ALREADY_REDEEMED)
    const duplicateRes = await request(app)
      .post('/api/vouchers/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(409);

    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.code).toBe('VOUCHER_ALREADY_REDEEMED');

    // 4. Stats - event should appear with 1 redeemed VIP voucher
    const statsRes = await request(app)
      .get('/api/vouchers/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data).toBeInstanceOf(Array);
    const eventStats = statsRes.body.data.find((s) => String(s.eventId) === String(eventId));
    expect(eventStats).toBeDefined();
    expect(eventStats.totalRedeemed).toBe(1);
    expect(eventStats.totalVoucherValue).toBe(VOUCHER_AMOUNT_VIP);
    const vipBreakdown = eventStats.breakdown.find((b) => b.ticketType === TICKET_TYPE_VIP);
    expect(vipBreakdown).toBeDefined();
    expect(vipBreakdown.redeemedCount).toBe(1);
    expect(vipBreakdown.totalValue).toBe(VOUCHER_AMOUNT_VIP);
  });

  it('rejects voucher scan when ticket not yet used for entry (NOT_ENTRY_USED)', async () => {
    await registerOrganizer();
    await createEventWithVouchers();
    await createTicket(TICKET_TYPE_STANDARD);

    // Skip entry scan - go straight to voucher scan
    const res = await request(app)
      .post('/api/vouchers/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_ENTRY_USED');
  });

  it('rejects voucher scan when ticket type has no voucher configured (NO_VOUCHER_CONFIGURED)', async () => {
    await registerOrganizer();

    // Create event with one ticket type that has voucherAmount and one without
    const createRes = await request(app)
      .post('/api/organizer/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Mixed Voucher Event',
        description: 'Event with mixed voucher config',
        dates: {
          startDate: new Date(Date.now() - 60 * 60 * 1000),
          endDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
          timezone: 'UTC',
        },
        pricing: { price: 0, currency: 'KES', isFree: true },
        ticketTypes: [
          { name: 'WithVoucher', price: 500, quantity: 5, voucherAmount: 100 },
          { name: 'NoVoucher', price: 300, quantity: 10 }, // no voucherAmount
        ],
      })
      .expect(201);

    eventId = createRes.body.data.id;
    const event = await Event.findById(eventId);
    event.status = 'published';
    await event.save();

    await createTicket('NoVoucher');

    // Entry scan first
    await request(app)
      .post('/api/tickets/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(200);

    // Voucher scan - should fail for NoVoucher ticket type
    const res = await request(app)
      .post('/api/vouchers/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ qr: qrString })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NO_VOUCHER_CONFIGURED');
  });

  it('stats reflect dynamic voucherAmount (retroactive) and multiple ticket types', async () => {
    await registerOrganizer();
    await createEventWithVouchers();

    // Create and redeem one VIP and one Standard
    await createTicket(TICKET_TYPE_VIP);
    await request(app).post('/api/tickets/scan').set('Authorization', `Bearer ${accessToken}`).send({ qr: qrString }).expect(200);
    await request(app).post('/api/vouchers/scan').set('Authorization', `Bearer ${accessToken}`).send({ qr: qrString }).expect(200);

    await createTicket(TICKET_TYPE_STANDARD);
    await request(app).post('/api/tickets/scan').set('Authorization', `Bearer ${accessToken}`).send({ qr: qrString }).expect(200);
    await request(app).post('/api/vouchers/scan').set('Authorization', `Bearer ${accessToken}`).send({ qr: qrString }).expect(200);

    const statsRes = await request(app)
      .get('/api/vouchers/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const eventStats = statsRes.body.data.find((s) => String(s.eventId) === String(eventId));
    expect(eventStats.totalRedeemed).toBe(2);
    expect(eventStats.totalVoucherValue).toBe(VOUCHER_AMOUNT_VIP + VOUCHER_AMOUNT_STANDARD);

    const vipB = eventStats.breakdown.find((b) => b.ticketType === TICKET_TYPE_VIP);
    const stdB = eventStats.breakdown.find((b) => b.ticketType === TICKET_TYPE_STANDARD);
    expect(vipB.redeemedCount).toBe(1);
    expect(vipB.totalValue).toBe(VOUCHER_AMOUNT_VIP);
    expect(stdB.redeemedCount).toBe(1);
    expect(stdB.totalValue).toBe(VOUCHER_AMOUNT_STANDARD);
  });
});
