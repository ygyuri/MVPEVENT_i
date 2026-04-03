const mongoose = require('mongoose');
const Order = require('../models/Order');
const { paidCompletedOrderMatch } = require('../utils/paidOrderFilter');

/**
 * Sales report aggregation aligned with GET /events/:eventId/finance (organizer net = gross − commission).
 * Adds pro-rata service fees for admin reporting (not subtracted from organizer net here).
 *
 * @param {import('mongoose').Document | object} event - Event doc (needs _id, commissionRate, title, slug, dates, pricing)
 * @returns {Promise<object>}
 */
async function getEventSalesReport(event) {
  const eventObjectId = new mongoose.Types.ObjectId(String(event._id));
  const rate = event.commissionRate ?? 6;
  const currency = event.pricing?.currency || 'KES';

  const baseStages = [
    {
      $match: paidCompletedOrderMatch({
        'items.eventId': eventObjectId,
      }),
    },
    { $unwind: '$items' },
    { $match: { 'items.eventId': eventObjectId } },
    {
      $addFields: {
        _orderSubtotal: { $ifNull: ['$pricing.subtotal', 0] },
        _orderTransactionFee: { $ifNull: ['$pricing.transactionFee', 0] },
        _orderServiceFee: { $ifNull: ['$pricing.serviceFee', 0] },
        _itemSubtotal: { $ifNull: ['$items.subtotal', 0] },
        _itemQuantity: { $ifNull: ['$items.quantity', 0] },
        _commissionRate: { $ifNull: [rate, 6] },
      },
    },
    {
      $addFields: {
        _itemShare: {
          $cond: [
            { $gt: ['$_orderSubtotal', 0] },
            { $divide: ['$_itemSubtotal', '$_orderSubtotal'] },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        _itemTransactionFee: { $multiply: ['$_orderTransactionFee', '$_itemShare'] },
        _itemServiceFee: { $multiply: ['$_orderServiceFee', '$_itemShare'] },
        _itemCommission: {
          $multiply: ['$_itemSubtotal', { $divide: ['$_commissionRate', 100] }],
        },
        _itemNetToOrganizer: {
          $subtract: [
            '$_itemSubtotal',
            { $multiply: ['$_itemSubtotal', { $divide: ['$_commissionRate', 100] }] },
          ],
        },
      },
    },
  ];

  const [facetResult] = await Order.aggregate([
    ...baseStages,
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              ticketsSold: { $sum: '$_itemQuantity' },
              grossSubtotal: { $sum: '$_itemSubtotal' },
              transactionFees: { $sum: '$_itemTransactionFee' },
              serviceFees: { $sum: '$_itemServiceFee' },
              commissionFees: { $sum: '$_itemCommission' },
              _orderIds: { $addToSet: '$_id' },
            },
          },
          {
            $project: {
              _id: 0,
              ticketsSold: 1,
              grossSubtotal: 1,
              transactionFees: 1,
              serviceFees: 1,
              commissionFees: 1,
              netToOrganizer: {
                $subtract: ['$grossSubtotal', '$commissionFees'],
              },
              ordersCount: { $size: '$_orderIds' },
            },
          },
        ],
        byTicketType: [
          {
            $group: {
              _id: '$items.ticketType',
              quantity: { $sum: '$_itemQuantity' },
              grossSubtotal: { $sum: '$_itemSubtotal' },
              transactionFees: { $sum: '$_itemTransactionFee' },
              serviceFees: { $sum: '$_itemServiceFee' },
              commissionFees: { $sum: '$_itemCommission' },
              netToOrganizer: { $sum: '$_itemNetToOrganizer' },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const totalsRow = facetResult.totals[0] || {};
  const byTicketType = (facetResult.byTicketType || []).map((row) => ({
    ticketType: row._id || '—',
    quantity: row.quantity || 0,
    grossSubtotal: row.grossSubtotal || 0,
    transactionFees: row.transactionFees || 0,
    serviceFees: row.serviceFees || 0,
    commissionFees: row.commissionFees || 0,
    netToOrganizer: (row.grossSubtotal || 0) - (row.commissionFees || 0),
  }));

  return {
    event: {
      id: String(event._id),
      title: event.title || 'Event',
      slug: event.slug || '',
      startDate: event.dates?.startDate || null,
      commissionRate: rate,
      currency,
    },
    totals: {
      ticketsSold: totalsRow.ticketsSold || 0,
      ordersCount: totalsRow.ordersCount || 0,
      grossSubtotal: totalsRow.grossSubtotal || 0,
      transactionFees: totalsRow.transactionFees || 0,
      serviceFees: totalsRow.serviceFees || 0,
      commissionFees: totalsRow.commissionFees || 0,
      netToOrganizer: totalsRow.netToOrganizer ?? 0,
    },
    byTicketType,
    generatedAt: new Date(),
  };
}

module.exports = {
  getEventSalesReport,
};
