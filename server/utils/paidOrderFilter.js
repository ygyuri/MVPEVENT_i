/**
 * Orders where payment actually completed (M-Pesa / PayHero callbacks set
 * `payment.status`; root `paymentStatus` is often left "pending").
 * Use everywhere we report revenue, ticket sales, or order counts for organizers.
 */
const PAID_ORDER_STATUSES = ["paid", "completed", "confirmed"];

function paidCompletedOrderMatch(extra = {}) {
  return {
    status: { $in: PAID_ORDER_STATUSES },
    "payment.status": "completed",
    ...extra,
  };
}

module.exports = {
  PAID_ORDER_STATUSES,
  paidCompletedOrderMatch,
};
