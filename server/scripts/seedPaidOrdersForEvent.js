/**
 * Seed paid/completed orders + tickets for one event (local verification).
 *
 * Matches production payment shape: status "paid", payment.status "completed".
 *
 * Usage:
 *   node scripts/seedPaidOrdersForEvent.js                    # default event id below
 *   node scripts/seedPaidOrdersForEvent.js <mongoEventId>
 *   node scripts/seedPaidOrdersForEvent.js <id> --with-noise   # +1 failed order (no extra paid tickets)
 *
 * Requires MONGODB_URI (e.g. from server/.env).
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const { paidCompletedOrderMatch } = require("../utils/paidOrderFilter");

const DEFAULT_EVENT_ID = "69beab6c3c0abec2004d66e4";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

function parseArgs() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  return {
    eventId: args[0] || DEFAULT_EVENT_ID,
    withNoise: flags.has("--with-noise"),
  };
}

async function createPaidOrder(event, { quantity, suffix }) {
  const tt = event.ticketTypes?.[0];
  const unitPrice = tt?.price ?? 1000;
  const ticketTypeName = tt?.name || "General admission";
  const currency = event.pricing?.currency || "KES";

  const subtotal = unitPrice * quantity;
  const serviceFee = Math.max(1, Math.round(subtotal * 0.03));
  const transactionFee = 0;
  const total = subtotal + serviceFee + transactionFee;

  const order = new Order({
    customer: {
      firstName: "Seed",
      lastName: `Paid${suffix}`,
      email: `seed-paid-${suffix}@example.test`,
      phone: "+254712000000",
    },
    items: [
      {
        eventId: event._id,
        eventTitle: event.title,
        ticketType: ticketTypeName,
        quantity,
        unitPrice,
        subtotal,
      },
    ],
    pricing: {
      subtotal,
      serviceFee,
      transactionFee,
      total,
      currency,
    },
    totalAmount: total,
    status: "paid",
    paymentStatus: "completed",
    payment: {
      method: "mpesa",
      status: "completed",
      paidAt: new Date(),
      mpesaResultCode: "0",
      mpesaTransactionId: `SEED-${Date.now()}-${suffix}`,
    },
    completedAt: new Date(),
    isGuestOrder: true,
    purchaseSource: "direct_checkout",
  });

  await order.save();

  for (let i = 0; i < quantity; i += 1) {
    const ticket = new Ticket({
      orderId: order._id,
      eventId: event._id,
      holder: {
        firstName: "Seed",
        lastName: `Paid${suffix}`,
        email: `seed-paid-${suffix}@example.test`,
        phone: "+254712000000",
      },
      ticketType: ticketTypeName,
      price: unitPrice,
      status: "active",
    });
    await ticket.save();
  }

  return order;
}

/** Failed checkout: cancelled order + stray active tickets (should NOT count on dashboard). */
async function createNoiseFailedOrder(event) {
  const tt = event.ticketTypes?.[0];
  const unitPrice = tt?.price ?? 1000;
  const ticketTypeName = tt?.name || "General admission";
  const currency = event.pricing?.currency || "KES";
  const quantity = 2;
  const subtotal = unitPrice * quantity;

  const order = new Order({
    customer: {
      firstName: "Seed",
      lastName: "Failed",
      email: "seed-failed@example.test",
      phone: "+254712000099",
    },
    items: [
      {
        eventId: event._id,
        eventTitle: event.title,
        ticketType: ticketTypeName,
        quantity,
        unitPrice,
        subtotal,
      },
    ],
    pricing: {
      subtotal,
      serviceFee: 0,
      transactionFee: 0,
      total: subtotal,
      currency,
    },
    totalAmount: subtotal,
    status: "cancelled",
    paymentStatus: "failed",
    payment: {
      method: "mpesa",
      status: "failed",
      mpesaResultCode: "1",
    },
    isGuestOrder: true,
    purchaseSource: "direct_checkout",
  });
  await order.save();

  for (let i = 0; i < quantity; i += 1) {
    await new Ticket({
      orderId: order._id,
      eventId: event._id,
      holder: {
        firstName: "Seed",
        lastName: "Failed",
        email: "seed-failed@example.test",
        phone: "+254712000099",
      },
      ticketType: ticketTypeName,
      price: unitPrice,
      status: "active",
    }).save();
  }
}

async function countPaidMetrics(eventId) {
  const eid = new mongoose.Types.ObjectId(eventId);
  const event = await Event.findById(eid).select("organizer").lean();
  if (!event) return null;

  const organizerEvents = await Event.find({ organizer: event.organizer })
    .select("_id")
    .lean();
  const eventIds = organizerEvents.map((e) => e._id);

  const [totalOrders, agg] = await Promise.all([
    Order.countDocuments(paidCompletedOrderMatch({ "items.eventId": { $in: eventIds } })),
    Ticket.aggregate([
      {
        $match: {
          eventId: eid,
          status: { $in: ["active", "used"] },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "ord",
        },
      },
      { $unwind: "$ord" },
      {
        $match: {
          "ord.status": { $in: ["paid", "completed", "confirmed"] },
          "ord.payment.status": "completed",
        },
      },
      { $count: "n" },
    ]),
  ]);

  const ticketsForEvent = agg[0]?.n ?? 0;

  const financeAgg = await Order.aggregate([
    {
      $match: paidCompletedOrderMatch({ "items.eventId": eid }),
    },
    { $unwind: "$items" },
    { $match: { "items.eventId": eid } },
    {
      $group: {
        _id: null,
        ticketsSold: { $sum: "$items.quantity" },
        orderIds: { $addToSet: "$_id" },
      },
    },
  ]);
  const row = financeAgg[0];
  const financeTickets = row?.ticketsSold ?? 0;
  const financeOrders = row?.orderIds?.length ?? 0;

  return {
    organizerId: String(event.organizer),
    totalOrdersOrganizer: totalOrders,
    paidTicketsThisEvent: ticketsForEvent,
    financeEndpointTickets: financeTickets,
    financeEndpointOrders: financeOrders,
  };
}

async function main() {
  const { eventId, withNoise } = parseArgs();

  console.log("Connecting:", MONGODB_URI.replace(/:[^:@]+@/, ":****@"));
  await mongoose.connect(MONGODB_URI);

  const event = await Event.findById(eventId);
  if (!event) {
    console.error("Event not found:", eventId);
    process.exit(1);
  }

  console.log("\nEvent:", event.title);
  console.log("Organizer:", event.organizer);
  console.log("Ticket types:", event.ticketTypes?.length || 0);

  const before = await countPaidMetrics(eventId);
  console.log("\n--- Before seed ---");
  console.log(JSON.stringify(before, null, 2));

  const o1 = await createPaidOrder(event, { quantity: 2, suffix: "A" });
  const o2 = await createPaidOrder(event, { quantity: 3, suffix: "B" });
  console.log("\nCreated paid orders:", o1.orderNumber, o2.orderNumber, "(5 tickets total)");

  if (withNoise) {
    await createNoiseFailedOrder(event);
    console.log("Created noise: 1 cancelled/failed order + 2 active tickets (should not increase paid counts)");
  }

  const after = await countPaidMetrics(eventId);
  console.log("\n--- After seed (same rules as dashboard / finance API) ---");
  console.log(JSON.stringify(after, null, 2));

  console.log(
    "\nVerify in UI: http://localhost:3001/organizer/events/" +
      eventId +
      " and organizer home. Paid tickets for this event should increase by 5; organizer total orders/tickets depend on other events."
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
