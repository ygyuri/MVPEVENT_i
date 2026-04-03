#!/usr/bin/env node
/**
 * Inspect tickets and orders for a user email (local debugging).
 *
 * Usage:
 *   cd server && node scripts/checkUserTickets.js pollscustomer@gmail.com
 *
 * Uses MONGODB_URI from server/.env (or default localhost).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error("Usage: node scripts/checkUserTickets.js <email>");
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to:", MONGODB_URI.replace(/\/\/.*@/, "//***@"), "\n");

  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.log(`No user document with email: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("USER");
  console.log("  _id:", user._id.toString());
  console.log("  email:", user.email);
  console.log("  name:", user.name || "(none)");
  console.log("  role:", user.role);

  const byOwner = await Ticket.find({ ownerUserId: user._id })
    .populate("eventId", "title slug")
    .populate("orderId", "status paymentStatus orderNumber")
    .lean();

  console.log("\nTICKETS where ownerUserId = this user:", byOwner.length);
  byOwner.forEach((t, i) => {
    const o = t.orderId;
    console.log(`  [${i + 1}] ticket ${t._id}`);
    console.log(`      event: ${t.eventId?.title || t.eventId} (${t.eventId?._id})`);
    console.log(
      `      order: ${o?.orderNumber || o?._id} status=${o?.status} paymentStatus=${o?.paymentStatus}`
    );
    console.log(`      holder.email: ${t.holder?.email} ticketType: ${t.ticketType}`);
  });

  const ordersByCustomerId = await Order.find({
    "customer.userId": user._id,
  })
    .select("orderNumber status paymentStatus customer.email items")
    .lean();

  console.log("\nORDERS where customer.userId = this user:", ordersByCustomerId.length);
  ordersByCustomerId.slice(0, 20).forEach((o) => {
    console.log(
      `  ${o.orderNumber} status=${o.status} paymentStatus=${o.paymentStatus} customer.email=${o.customer?.email}`
    );
  });

  // Tickets where holder email matches but owner might be someone else (legacy mismatch)
  const byHolderEmail = await Ticket.find({ "holder.email": email })
    .populate("orderId", "status paymentStatus customer.userId")
    .lean();

  console.log(
    '\nTICKETS where holder.email matches (may belong to another ownerUserId):',
    byHolderEmail.length
  );
  byHolderEmail.forEach((t) => {
    const ownerMatch = t.ownerUserId?.toString() === user._id.toString();
    console.log(
      `  ticket ${t._id} ownerUserId=${t.ownerUserId} ${ownerMatch ? "OK" : "MISMATCH — wallet uses ownerUserId only"}`
    );
  });

  console.log(
    "\n---\nWallet API lists tickets by ownerUserId only.\nIf MISMATCH tickets exist, re-buy with current code or migrate ownerUserId in MongoDB.\n"
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  mongoose.disconnect().finally(() => process.exit(1));
});
