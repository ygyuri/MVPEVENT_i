/* eslint-disable no-console */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const User = require('../models/User')
const Event = require('../models/Event')
const Order = require('../models/Order')
const Ticket = require('../models/Ticket')
const Reminder = require('../models/Reminder')
const ReminderTemplate = require('../models/ReminderTemplate')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i'

const generateOrderNumber = () => `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Get organizer@example.com
  const organizer = await User.findOne({ email: 'organizer@example.com' })
  
  if (!organizer) {
    console.error('❌ organizer@example.com not found!')
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log('✅ Found organizer@example.com')
  console.log('User ID:', organizer._id)
  console.log('Name:', organizer.firstName, organizer.lastName)

  // Ensure profile phone exists
  if (!organizer.profile) {
    organizer.profile = {}
  }
  if (!organizer.profile.phone) {
    organizer.profile.phone = '+254712345678'
    await organizer.save()
    console.log('✅ Added phone number to profile')
  }

  // Get published events
  const events = await Event.find({ status: 'published' }).limit(3)
  if (events.length === 0) {
    console.error('❌ No events found. Run main seed script first.')
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`✅ Found ${events.length} events`)

  // Clean existing test data for this user
  await Order.deleteMany({ 'customerInfo.userId': organizer._id })
  await Ticket.deleteMany({ ownerUserId: organizer._id })
  await Reminder.deleteMany({ userId: organizer._id })
  console.log('✅ Cleaned existing test data for organizer@example.com')

  // Create test orders and tickets
  const orders = []
  const tickets = []

  for (let i = 0; i < Math.min(3, events.length); i++) {
    const event = events[i]

    // Create order
    const order = new Order({
      orderNumber: generateOrderNumber(),
      customerInfo: {
        userId: organizer._id,
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        phone: organizer.profile?.phone || '+254712345678'
      },
      customer: {
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        phone: organizer.profile?.phone || '+254712345678'
      },
      items: [{
        eventId: event._id,
        eventTitle: event.title,
        ticketType: 'General Admission',
        quantity: 1,
        unitPrice: event.pricing?.price || 0,
        subtotal: event.pricing?.price || 0
      }],
      pricing: {
        subtotal: event.pricing?.price || 0,
        serviceFee: Math.round((event.pricing?.price || 0) * 0.05),
        total: Math.round((event.pricing?.price || 0) * 1.05)
      },
      status: 'paid',
      payment: {
        method: 'mpesa',
        status: 'completed',
        paidAt: new Date()
      },
      createdAt: new Date()
    })
    await order.save()
    orders.push(order)

    // Create ticket
    const ticket = new Ticket({
      orderId: order._id,
      eventId: event._id,
      ownerUserId: organizer._id,
      holder: {
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        phone: organizer.profile?.phone || '+254712345678'
      },
      ticketType: 'General Admission',
      price: event.pricing?.price || 0,
      status: 'active',
      metadata: {
        purchaseDate: new Date()
      }
    })
    await ticket.save()
    tickets.push(ticket)

    console.log(`✅ Created order ${order.orderNumber} and ticket for ${event.title}`)
  }

  // Create reminder templates (if they don't exist)
  const templatesExist = await ReminderTemplate.countDocuments()
  if (templatesExist === 0) {
    const templates = [
      {
        name: '24h_email',
        channel: 'email',
        messageContent: 'Hi {{firstName}}, your event "{{eventTitle}}" starts in 24 hours at {{eventTime}}. Don\'t forget to bring your ticket!',
        variables: ['firstName', 'eventTitle', 'eventTime'],
        isDefault: true
      },
      {
        name: '2h_email',
        channel: 'email',
        messageContent: 'Hi {{firstName}}, your event "{{eventTitle}}" starts in 2 hours at {{eventTime}}. See you there!',
        variables: ['firstName', 'eventTitle', 'eventTime'],
        isDefault: true
      },
      {
        name: '30m_email',
        channel: 'email',
        messageContent: 'Hi {{firstName}}, your event "{{eventTitle}}" starts in 30 minutes at {{eventTime}}. Time to head out!',
        variables: ['firstName', 'eventTitle', 'eventTime'],
        isDefault: true
      },
      {
        name: '24h_sms',
        channel: 'sms',
        messageContent: 'Event reminder: {{eventTitle}} starts in 24h at {{eventTime}}. Bring your ticket!',
        variables: ['eventTitle', 'eventTime'],
        isDefault: true
      },
      {
        name: '2h_sms',
        channel: 'sms',
        messageContent: 'Event reminder: {{eventTitle}} starts in 2h at {{eventTime}}. See you there!',
        variables: ['eventTitle', 'eventTime'],
        isDefault: true
      }
    ]
    await ReminderTemplate.insertMany(templates)
    console.log(`✅ Created ${templates.length} reminder templates`)
  } else {
    console.log(`✅ Using existing ${templatesExist} reminder templates`)
  }

  // Create reminders for the organizer user
  const reminders = []

  for (let i = 0; i < Math.min(2, events.length); i++) {
    const event = events[i]
    const ticket = tickets[i]
    const eventStart = new Date(event.dates.startDate)

    // 24h reminder (pending)
    reminders.push(new Reminder({
      eventId: event._id,
      userId: organizer._id,
      ticketId: ticket._id,
      reminderType: '24h',
      scheduledTime: new Date(eventStart.getTime() - 24 * 60 * 60 * 1000),
      deliveryMethod: 'email',
      status: 'pending',
      payload: new Map([
        ['email', organizer.email],
        ['subject', `Reminder: ${event.title} starts in 24 hours`],
        ['html', `<p>Hi ${organizer.firstName}, your event <strong>${event.title}</strong> starts at ${eventStart.toLocaleString()}.</p>`]
      ]),
      timezone: 'UTC'
    }))

    // 2h reminder (pending) - both email and SMS
    reminders.push(new Reminder({
      eventId: event._id,
      userId: organizer._id,
      ticketId: ticket._id,
      reminderType: '2h',
      scheduledTime: new Date(eventStart.getTime() - 2 * 60 * 60 * 1000),
      deliveryMethod: 'both',
      status: 'pending',
      payload: new Map([
        ['email', organizer.email],
        ['phone', organizer.profile?.phone],
        ['subject', `Reminder: ${event.title} starts in 2 hours`],
        ['html', `<p>Hi ${organizer.firstName}, your event <strong>${event.title}</strong> starts soon!</p>`],
        ['text', `Event reminder: ${event.title} starts in 2h. See you there!`]
      ]),
      timezone: 'UTC'
    }))

    // 30m reminder (pending) - SMS only
    reminders.push(new Reminder({
      eventId: event._id,
      userId: organizer._id,
      ticketId: ticket._id,
      reminderType: '30m',
      scheduledTime: new Date(eventStart.getTime() - 30 * 60 * 1000),
      deliveryMethod: 'sms',
      status: 'pending',
      payload: new Map([
        ['phone', organizer.profile?.phone],
        ['text', `Event reminder: ${event.title} starts in 30min!`]
      ]),
      timezone: 'UTC'
    }))
  }

  // Add some history reminders (sent/failed)
  if (events.length > 0) {
    // Sent reminder (for history)
    reminders.push(new Reminder({
      eventId: events[0]._id,
      userId: organizer._id,
      ticketId: tickets[0]._id,
      reminderType: '24h',
      scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      deliveryMethod: 'email',
      status: 'sent',
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      payload: new Map([
        ['email', organizer.email],
        ['subject', `Reminder: ${events[0].title} starts in 24 hours`]
      ]),
      timezone: 'UTC'
    }))

    // Failed reminder (for retry testing)
    reminders.push(new Reminder({
      eventId: events[0]._id,
      userId: organizer._id,
      ticketId: tickets[0]._id,
      reminderType: '2h',
      scheduledTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      deliveryMethod: 'sms',
      status: 'failed',
      attempts: 3,
      lastError: 'SMS service temporarily unavailable',
      payload: new Map([
        ['phone', organizer.profile?.phone],
        ['text', `Event reminder: ${events[0].title} starts in 2h.`]
      ]),
      timezone: 'UTC'
    }))
  }

  await Reminder.insertMany(reminders)
  console.log(`✅ Created ${reminders.length} reminders`)

  const summary = {
    user: organizer.email,
    userId: organizer._id,
    orders: orders.length,
    tickets: tickets.length,
    reminders: await Reminder.countDocuments({ userId: organizer._id })
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 SUCCESS! REMINDERS SEEDED')
  console.log('='.repeat(50))
  console.log('\n📧 Login with:')
  console.log('   Email: organizer@example.com')
  console.log('   Password: password123')
  console.log('\n📊 Test data summary:')
  console.log('   User ID:', summary.userId)
  console.log('   Orders:', summary.orders)
  console.log('   Tickets:', summary.tickets)
  console.log('   Reminders:', summary.reminders)
  console.log('\n✅ Test these pages:')
  console.log('   1. /preferences/reminders - Manage upcoming reminders')
  console.log('   2. /reminders/history - View sent/failed reminders')
  console.log('   3. /checkout - Test inline reminder setup')
  console.log('   4. /events/:slug - Test quick toggle')
  console.log('\n📱 Reminder breakdown:')
  console.log('   - 6 pending reminders (24h, 2h, 30m for 2 events)')
  console.log('   - 1 sent reminder (for history view)')
  console.log('   - 1 failed reminder (for retry testing)')
  console.log('\n💡 Delivery methods to test:')
  console.log('   - Email only')
  console.log('   - SMS only')
  console.log('   - Both email & SMS')
  console.log('='.repeat(50))

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('❌ Failed:', err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})

