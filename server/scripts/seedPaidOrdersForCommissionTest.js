/* eslint-disable no-console */
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Event = require("../models/Event");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

const daysAgo = (d) => {
  const base = new Date();
  base.setDate(base.getDate() - d);
  return base;
};

const safeNumber = (n, fallback = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
};

const buildOrderNumber = (prefix) => {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
};

async function ensureUser({ email, username, firstName, lastName, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    let desiredUsername = username;
    if (desiredUsername) {
      const existingByUsername = await User.findOne({ username: desiredUsername })
        .select("_id email")
        .lean();
      if (existingByUsername) {
        desiredUsername = `${desiredUsername}_${Math.random()
          .toString(36)
          .substring(2, 7)
          .toLowerCase()}`;
      }
    }
    user = new User({
      email,
      username: desiredUsername,
      name:
        `${firstName || ""} ${lastName || ""}`.trim() || desiredUsername,
      firstName,
      lastName,
      role,
      emailVerified: true,
      isActive: true,
    });
    await user.setPassword("password123");
    await user.save();
    console.log(`✅ Created ${role}: ${email} / password123`);
  } else {
    console.log(`ℹ️  Using existing ${role}: ${email}`);
  }
  return user;
}

async function ensureEventCommissionRate(event, commissionRate) {
  const desired = safeNumber(commissionRate, 6);
  if (event.commissionRate !== desired) {
    event.commissionRate = desired;
    await event.save();
    console.log(
      `🔧 Set commissionRate for ${event.slug} to ${desired}% (eventId=${event._id})`
    );
  }
}

async function createPaidOrderForEvent({
  organizer,
  customer,
  event,
  ticketType,
  quantity,
  unitPrice,
  transactionFee,
  createdAt,
  orderTag,
}) {
  const q = Math.max(1, Number(quantity || 1));
  const price = safeNumber(unitPrice, 0);
  const subtotal = Number((q * price).toFixed(2));

  const txFee = safeNumber(transactionFee, 0);
  const serviceFee = 0;
  const total = Number((subtotal + serviceFee).toFixed(2));

  const orderNumber = buildOrderNumber(orderTag);

  const order = new Order({
    orderNumber,
    purchaseSource: "admin",
    customer: {
      userId: customer._id,
      email: customer.email,
      name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.profile?.phone || "+254700000000",
    },
    items: [
      {
        eventId: event._id,
        eventTitle: event.title,
        ticketType,
        quantity: q,
        unitPrice: price,
        subtotal,
      },
    ],
    pricing: {
      subtotal,
      serviceFee,
      transactionFee: txFee,
      total,
      currency: event.pricing?.currency || "KES",
    },
    totalAmount: total,
    paymentStatus: "completed",
    status: "completed",
    payment: {
      method: "mpesa",
      status: "completed",
      paidAt: createdAt,
      mpesaReceiptNumber: `RCP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    },
    completedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    metadata: {
      source: orderTag,
    },
  });

  await order.save();

  // Create tickets for the order (so Ticket.countDocuments in overview matches)
  const tickets = [];
  for (let i = 0; i < q; i++) {
    tickets.push(
      new Ticket({
        orderId: order._id,
        eventId: event._id,
        ownerUserId: customer._id,
        holder: {
          firstName: customer.firstName || "Jane",
          lastName: customer.lastName || "Customer",
          email: customer.email,
          phone: customer.profile?.phone || "+254700000000",
        },
        ticketType,
        price,
        status: "active",
        metadata: {
          purchaseDate: createdAt,
        },
        createdAt,
        updatedAt: createdAt,
      })
    );
  }
  if (tickets.length) {
    await Ticket.insertMany(tickets);
  }

  console.log(
    `✅ Seeded paid order ${order.orderNumber} | event=${event.slug} | qty=${q} | subtotal=${subtotal} | txFee=${txFee} | commissionRate=${event.commissionRate ?? 6}% | createdAt=${createdAt.toISOString()}`
  );

  return order;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB:", MONGODB_URI);

  const admin = await ensureUser({
    email: "admin@test.com",
    username: "admin",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  });

  const organizer =
    (await User.findOne({ email: "organizer@example.com" })) ||
    (await User.findOne({ role: "organizer" })) ||
    (await ensureUser({
      email: "organizer@test.com",
      username: "organizer",
      firstName: "Org",
      lastName: "Test",
      role: "organizer",
    }));

  const customer = await ensureUser({
    email: "customer@test.com",
    username: "customer",
    firstName: "Jane",
    lastName: "Customer",
    role: "customer",
  });

  // Prefer events created by seedLocalData.js (stable slugs)
  const techEvent = await Event.findOne({ slug: "tech-conference-2025" });
  const musicEvent = await Event.findOne({ slug: "afro-beats-festival" });

  if (!techEvent || !musicEvent) {
    console.error(
      "❌ Missing events. Run server/scripts/seedLocalData.js first (it creates tech-conference-2025 and afro-beats-festival)."
    );
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  // Ensure events belong to our organizer for dashboard filtering
  // (If you already use a different organizer, we don't overwrite organizer ownership.)
  if (String(techEvent.organizer) !== String(organizer._id)) {
    console.warn(
      `⚠️ tech-conference-2025 organizer is ${techEvent.organizer} (expected ${organizer._id}). Organizer dashboard will reflect whoever owns the event.`
    );
  }
  if (String(musicEvent.organizer) !== String(organizer._id)) {
    console.warn(
      `⚠️ afro-beats-festival organizer is ${musicEvent.organizer} (expected ${organizer._id}). Organizer dashboard will reflect whoever owns the event.`
    );
  }

  await ensureEventCommissionRate(techEvent, 6);
  await ensureEventCommissionRate(musicEvent, 10);

  // Idempotency: remove previous seeded orders/tickets for this script
  const seedTag = "commission_test";
  const oldOrders = await Order.find({ "metadata.source": seedTag })
    .select("_id")
    .lean();
  const oldOrderIds = oldOrders.map((o) => o._id);
  if (oldOrderIds.length) {
    await Ticket.deleteMany({ orderId: { $in: oldOrderIds } });
    await Order.deleteMany({ _id: { $in: oldOrderIds } });
    console.log(`🧹 Removed ${oldOrderIds.length} previously-seeded orders`);
  }

  // Create 4 orders: 2 in this month (recent), 2 older (previous month-ish)
  const ordersToCreate = [
    {
      event: techEvent,
      ticketType: techEvent.ticketTypes?.[0]?.name || "Early Bird",
      quantity: 2,
      unitPrice: techEvent.ticketTypes?.[0]?.price || 5000,
      transactionFee: 45,
      createdAt: daysAgo(2),
    },
    {
      event: musicEvent,
      ticketType: musicEvent.ticketTypes?.[0]?.name || "General Admission",
      quantity: 3,
      unitPrice: musicEvent.ticketTypes?.[0]?.price || 2000,
      transactionFee: 49,
      createdAt: daysAgo(5),
    },
    {
      event: techEvent,
      ticketType: techEvent.ticketTypes?.[1]?.name || "Regular",
      quantity: 1,
      unitPrice: techEvent.ticketTypes?.[1]?.price || 7500,
      transactionFee: 60,
      createdAt: daysAgo(35),
    },
    {
      event: musicEvent,
      ticketType: musicEvent.ticketTypes?.[1]?.name || "VIP",
      quantity: 1,
      unitPrice: musicEvent.ticketTypes?.[1]?.price || 8000,
      transactionFee: 70,
      createdAt: daysAgo(40),
    },
  ];

  for (const spec of ordersToCreate) {
    await createPaidOrderForEvent({
      organizer,
      customer,
      event: spec.event,
      ticketType: spec.ticketType,
      quantity: spec.quantity,
      unitPrice: spec.unitPrice,
      transactionFee: spec.transactionFee,
      createdAt: spec.createdAt,
      orderTag: seedTag,
    });
  }

  const seededCount = await Order.countDocuments({ "metadata.source": seedTag });
  console.log(`\n🎉 Done. Seeded orders: ${seededCount}`);
  console.log("\n🔑 Test logins (password: password123)");
  console.log(`- Admin: ${admin.email}`);
  console.log(`- Organizer: ${organizer.email}`);
  console.log(`- Customer: ${customer.email}`);
  console.log("\n🔗 URLs");
  console.log("- Client: http://localhost:3001");
  console.log("- Organizer Dashboard: http://localhost:3001/organizer/dashboard");
  console.log("- Admin Events: http://localhost:3001/admin/events");

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_) { }
  process.exit(1);
});
