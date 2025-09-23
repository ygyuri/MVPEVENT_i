/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const { connectMongoDB } = require('../config/database');
const User = require('../models/User');
const Event = require('../models/Event');
const EventStaff = require('../models/EventStaff');
const Order = require('../models/Order');
const orderService = require('../services/orderService');

async function ensureUser({ email, username, role, firstName, lastName, password }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, username, role, firstName, lastName, emailVerified: true });
    if (password) await user.setPassword(password);
    await user.save();
    console.log(`Created user ${email} (${role}) / ${password || 'no-password'}`);
  }
  return user;
}

async function main() {
  await connectMongoDB();
  console.log('Connected to MongoDB');

  // Organizer and Customer
  const organizer = await ensureUser({
    email: 'organizer@example.com', username: 'organizer', role: 'organizer', firstName: 'Org', lastName: 'One', password: 'password123'
  });
  const customer = await ensureUser({
    email: 'customer@example.com', username: 'customer', role: 'customer', firstName: 'Cust', lastName: 'One', password: 'password123'
  });

  // Pick a published event or create a simple one
  let event = await Event.findOne({ status: 'published' });
  if (!event) {
    event = new Event({
      organizer: organizer._id,
      title: 'Sample Event',
      slug: `sample-event-${Date.now()}`,
      description: 'Sample seeded event',
      shortDescription: 'Sample',
      category: null,
      location: { venueName: 'Main Hall', city: 'Nairobi', country: 'KE' },
      dates: { startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      capacity: 100,
      pricing: { price: 1000, currency: 'KES', isFree: false },
      flags: { isFeatured: true },
      status: 'published'
    });
    await event.save();
    console.log('Created sample event:', event.title);
  }

  // Ensure organizer is staff for this event
  const staff = await EventStaff.findOneAndUpdate(
    { eventId: event._id, userId: organizer._id },
    { $set: { role: 'manager', isActive: true } },
    { upsert: true, new: true }
  );
  console.log('Staff assignment ensured:', staff.userId.toString());

  // Create a sample paid order for the customer
  const order = new Order({
    customer: {
      userId: customer._id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: '+254700000000'
    },
    items: [
      {
        eventId: event._id,
        eventTitle: event.title,
        ticketType: 'General Admission',
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000
      }
    ],
    pricing: { subtotal: 2000, serviceFee: orderService.calculateServiceFee(2000), total: 2000 + orderService.calculateServiceFee(2000), currency: 'KES' },
    status: 'paid',
    payment: { status: 'completed', method: 'mpesa', paidAt: new Date() }
  });
  await order.save();
  console.log('Created order:', order.orderNumber);

  // Generate tickets
  const tickets = await orderService.createTickets(order);
  console.log(`Created ${tickets.length} tickets for ${customer.email}`);

  await mongoose.disconnect();
  console.log('Done. Customer credentials: customer@example.com / password123');
  console.log('Organizer credentials: organizer@example.com / password123');
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});


