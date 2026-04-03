const { Writable } = require('stream');
const mongoose = require('mongoose');

jest.mock('../models/Order', () => ({
  aggregate: jest.fn(),
}));

const Order = require('../models/Order');
const eventSalesReportService = require('../services/eventSalesReportService');
const { streamSalesReportPdf } = require('../services/eventSalesReportPdf');

describe('eventSalesReportService', () => {
  beforeEach(() => {
    Order.aggregate.mockReset();
  });

  it('maps aggregation facet to report totals and ticket rows', async () => {
    Order.aggregate.mockResolvedValue([
      {
        totals: [
          {
            ticketsSold: 3,
            grossSubtotal: 300,
            transactionFees: 12,
            serviceFees: 9,
            commissionFees: 18,
            netToOrganizer: 282,
            ordersCount: 2,
          },
        ],
        byTicketType: [
          {
            _id: 'General',
            quantity: 2,
            grossSubtotal: 200,
            transactionFees: 8,
            serviceFees: 6,
            commissionFees: 12,
            netToOrganizer: 188,
          },
          {
            _id: 'VIP',
            quantity: 1,
            grossSubtotal: 100,
            transactionFees: 4,
            serviceFees: 3,
            commissionFees: 6,
            netToOrganizer: 94,
          },
        ],
      },
    ]);

    const event = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Sample Event',
      slug: 'sample-event',
      dates: { startDate: new Date('2025-06-01') },
      commissionRate: 6,
      pricing: { currency: 'KES' },
    };

    const report = await eventSalesReportService.getEventSalesReport(event);

    expect(Order.aggregate).toHaveBeenCalledTimes(1);
    expect(report.event.title).toBe('Sample Event');
    expect(report.event.currency).toBe('KES');
    expect(report.totals.ticketsSold).toBe(3);
    expect(report.totals.ordersCount).toBe(2);
    expect(report.totals.grossSubtotal).toBe(300);
    expect(report.totals.transactionFees).toBe(12);
    expect(report.totals.serviceFees).toBe(9);
    expect(report.totals.commissionFees).toBe(18);
    expect(report.totals.netToOrganizer).toBe(282);
    expect(report.byTicketType).toHaveLength(2);
    expect(report.byTicketType[0].ticketType).toBe('General');
    expect(report.byTicketType[0].netToOrganizer).toBe(188);
    expect(report.generatedAt).toBeInstanceOf(Date);
  });

  it('handles empty sales', async () => {
    Order.aggregate.mockResolvedValue([
      {
        totals: [],
        byTicketType: [],
      },
    ]);

    const event = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Empty',
      slug: 'empty',
      commissionRate: 6,
      pricing: { currency: 'USD' },
    };

    const report = await eventSalesReportService.getEventSalesReport(event);
    expect(report.totals.ticketsSold).toBe(0);
    expect(report.totals.netToOrganizer).toBe(0);
    expect(report.byTicketType).toEqual([]);
  });
});

describe('eventSalesReportPdf', () => {
  const baseReport = () => ({
    event: {
      id: new mongoose.Types.ObjectId().toString(),
      title: 'PDF Test Event',
      slug: 'pdf-test',
      startDate: new Date('2025-01-15'),
      commissionRate: 6,
      currency: 'KES',
    },
    totals: {
      ticketsSold: 2,
      ordersCount: 1,
      grossSubtotal: 200,
      transactionFees: 5,
      serviceFees: 4,
      commissionFees: 12,
      netToOrganizer: 188,
    },
    byTicketType: [
      {
        ticketType: 'GA',
        quantity: 2,
        grossSubtotal: 200,
        transactionFees: 5,
        serviceFees: 4,
        commissionFees: 12,
        netToOrganizer: 188,
      },
    ],
    generatedAt: new Date('2025-03-01T12:00:00Z'),
  });

  async function collectPdfBuffer(report, isAdmin) {
    const chunks = [];
    const dest = new Writable({
      write(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    await streamSalesReportPdf(dest, report, { isAdmin });
    return Buffer.concat(chunks);
  }

  it('writes admin PDF (binary header and trailer)', async () => {
    const buf = await collectPdfBuffer(baseReport(), true);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1').includes('%%EOF')).toBe(true);
  });

  it('writes organizer PDF (binary header and trailer)', async () => {
    const buf = await collectPdfBuffer(baseReport(), false);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1').includes('%%EOF')).toBe(true);
  });
});
