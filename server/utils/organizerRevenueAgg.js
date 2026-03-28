/**
 * Organizer dashboard revenue: sum of (line subtotal − commission) across paid orders.
 * Matches per-event finance (GET .../analytics/events/:id/finance) logic.
 */

/**
 * @param {unknown} v — aggregate $sum result (number, Long, Decimal128, etc.)
 * @returns {number}
 */
function coerceAggNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && typeof v.toNumber === "function") {
    try {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumAggRows(rows, key = "total") {
  if (!rows?.length) return 0;
  return coerceAggNumber(rows[0][key]);
}

/**
 * @param {Record<string, unknown>} paidOrderMatch — e.g. paidCompletedOrderMatch({ ... })
 * @param {import("mongoose").Types.ObjectId[]} eventIds — organizer's event ids
 * @returns {object[]} MongoDB aggregation pipeline stages
 */
function netToOrganizerPipeline(paidOrderMatch, eventIds) {
  return [
    { $match: paidOrderMatch },
    { $unwind: "$items" },
    {
      $match: {
        "items.eventId": { $in: eventIds },
      },
    },
    {
      $lookup: {
        from: "events",
        localField: "items.eventId",
        foreignField: "_id",
        as: "event",
      },
    },
    {
      $unwind: {
        path: "$event",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        _lineSub: {
          $cond: [
            { $gt: [{ $ifNull: ["$items.subtotal", 0] }, 0] },
            "$items.subtotal",
            {
              $multiply: [
                { $ifNull: ["$items.unitPrice", 0] },
                { $ifNull: ["$items.quantity", 1] },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        _itemCommission: {
          $multiply: [
            "$_lineSub",
            {
              $divide: [{ $ifNull: ["$event.commissionRate", 6] }, 100],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        _netToOrganizerLine: {
          $subtract: ["$_lineSub", "$_itemCommission"],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$_netToOrganizerLine" },
      },
    },
  ];
}

/** Plain-JS line subtotal (matches aggregation _lineSub). */
function orderItemLineSubtotal(item) {
  const s = Number(item?.subtotal);
  if (Number.isFinite(s) && s > 0) return s;
  return Number(item?.unitPrice || 0) * Number(item?.quantity || 0);
}

module.exports = {
  coerceAggNumber,
  sumAggRows,
  netToOrganizerPipeline,
  orderItemLineSubtotal,
};
