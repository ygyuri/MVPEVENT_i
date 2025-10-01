/* eslint-disable no-console */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const User = require('../models/User')
const Event = require('../models/Event')
const Order = require('../models/Order')
const Ticket = require('../models/Ticket')
const Reminder = require('../models/Reminder')
const ReminderTemplate = require('../models/ReminderTemplate')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin'

// Helper functions
const daysFromNow = (d) => {
  const base = new Date()
  base.setDate(base.getDate() + d)
  return base
}

const hoursFromNow = (h) => {
  const base = new Date()
  base.setHours(base.getHours() + h)
  return base
}

const generateOrderNumber = () => `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB for reminder seeding')

  // Clean existing test data
  await Reminder.deleteMany({})
  await ReminderTemplate.deleteMany({})
  console.log('Cleaned existing reminder data')

  // If specific user provided, use it for all seeds
  const seedUserId = process.env.SEED_USER_ID
  const seedUserEmail = process.env.SEED_USER_EMAIL
  let targetUser = null
  if (seedUserId || seedUserEmail) {
    targetUser = await User.findOne(seedUserId ? { _id: seedUserId } : { email: seedUserEmail })
    if (!targetUser) {
      throw new Error(`Seed target user not found for ${seedUserId || seedUserEmail}`)
    }
    console.log('Using target user for seeding:', { id: targetUser._id.toString(), email: targetUser.email, role: targetUser.role })
  }

  // Get or create test users (fallback if no target user specified)
  let testUser1 = targetUser || await User.findOne({ email: 'testuser1@example.com' })
  if (!testUser1) {
    testUser1 = new User({
      email: 'testuser1@example.com',
      username: 'testuser1',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer',
      emailVerified: true,
      profile: {
        phone: '+1234567890',
        city: 'San Francisco',
        country: 'USA'
      }
    })
    await testUser1.setPassword('password123')
    await testUser1.save()
    console.log('Created test user 1: testuser1@example.com')
  }

  let testUser2 = targetUser || await User.findOne({ email: 'testuser2@example.com' })
  if (!testUser2) {
    testUser2 = new User({
      email: 'testuser2@example.com',
      username: 'testuser2',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'customer',
      emailVerified: true,
      profile: {
        phone: '+1987654321',
        city: 'New York',
        country: 'USA'
      }
    })
    await testUser2.setPassword('password123')
    await testUser2.save()
    console.log('Created test user 2: testuser2@example.com')
  }

  // Get organizer
  const organizer = await User.findOne({ email: 'organizer@example.com' })
  if (!organizer) {
    console.error('Organizer user not found. Run main seed script first.')
    process.exit(1)
  }

  // Get events
  const events = await Event.find({ status: 'published' }).limit(3)
  if (events.length === 0) {
    console.error('No events found. Run main seed script first.')
    process.exit(1)
  }

  console.log(`Found ${events.length} events for seeding`)

  // Create test orders and tickets
  const orders = []
  const tickets = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const user = targetUser ? targetUser : (i % 2 === 0 ? testUser1 : testUser2)

    // Create order
    const order = new Order({
      orderNumber: generateOrderNumber(),
      customerInfo: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.profile?.phone || '+1234567890'
      },
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.profile?.phone || '+1234567890'
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
      ownerUserId: user._id,
      holder: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.profile?.phone || '+1234567890'
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

    console.log(`Created order ${order.orderNumber} and ticket for ${event.title}`)
  }

  // Create reminder templates
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
    },
    {
      name: '30m_sms',
      channel: 'sms',
      messageContent: 'Event reminder: {{eventTitle}} starts in 30min at {{eventTime}}. Time to go!',
      variables: ['eventTitle', 'eventTime'],
      isDefault: true
    }
  ]

  await ReminderTemplate.insertMany(templates)
  console.log(`Created ${templates.length} reminder templates`)

  // Create test reminders for different scenarios
  const reminders = []

  // Scenario 1: Upcoming reminders (24h, 2h, 30m from now)
  for (let i = 0; i < Math.min(2, events.length); i++) {
    const event = events[i]
    const ticket = tickets[i]
    const user = ticket.ownerUserId === testUser1._id ? testUser1 : testUser2
    const eventStart = new Date(event.dates.startDate)

    // 24h reminder
    const reminder24h = new Reminder({
      eventId: event._id,
      userId: user._id,
      ticketId: ticket._id,
      reminderType: '24h',
      scheduledTime: new Date(eventStart.getTime() - 24 * 60 * 60 * 1000),
      deliveryMethod: 'email',
      status: 'pending',
      payload: new Map([
        ['email', user.email],
        ['phone', user.profile?.phone],
        ['subject', `Reminder: ${event.title} starts in 24 hours`],
        ['html', `<p>Hi ${user.firstName}, your event <strong>${event.title}</strong> starts at ${eventStart.toLocaleString()}.</p>`],
        ['text', `Event reminder: ${event.title} starts in 24h at ${eventStart.toLocaleString()}. Bring your ticket!`]
      ]),
      timezone: 'UTC'
    })
    reminders.push(reminder24h)

    // 2h reminder
    const reminder2h = new Reminder({
      eventId: event._id,
      userId: user._id,
      ticketId: ticket._id,
      reminderType: '2h',
      scheduledTime: new Date(eventStart.getTime() - 2 * 60 * 60 * 1000),
      deliveryMethod: 'both',
      status: 'pending',
      payload: new Map([
        ['email', user.email],
        ['phone', user.profile?.phone],
        ['subject', `Reminder: ${event.title} starts in 2 hours`],
        ['html', `<p>Hi ${user.firstName}, your event <strong>${event.title}</strong> starts at ${eventStart.toLocaleString()}.</p>`],
        ['text', `Event reminder: ${event.title} starts in 2h at ${eventStart.toLocaleString()}. See you there!`]
      ]),
      timezone: 'UTC'
    })
    reminders.push(reminder2h)

    // 30m reminder
    const reminder30m = new Reminder({
      eventId: event._id,
      userId: user._id,
      ticketId: ticket._id,
      reminderType: '30m',
      scheduledTime: new Date(eventStart.getTime() - 30 * 60 * 1000),
      deliveryMethod: 'sms',
      status: 'pending',
      payload: new Map([
        ['email', user.email],
        ['phone', user.profile?.phone],
        ['subject', `Reminder: ${event.title} starts in 30 minutes`],
        ['html', `<p>Hi ${user.firstName}, your event <strong>${event.title}</strong> starts at ${eventStart.toLocaleString()}.</p>`],
        ['text', `Event reminder: ${event.title} starts in 30min at ${eventStart.toLocaleString()}. Time to go!`]
      ]),
      timezone: 'UTC'
    })
    reminders.push(reminder30m)
  }

  // Scenario 2: Some reminders already sent (for history testing)
  const sentReminders = [
    new Reminder({
      eventId: events[0]._id,
      userId: testUser1._id,
      ticketId: tickets[0]._id,
      reminderType: '24h',
      scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      deliveryMethod: 'email',
      status: 'sent',
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      payload: new Map([
        ['email', testUser1.email],
        ['subject', `Reminder: ${events[0].title} starts in 24 hours`],
        ['html', `<p>Hi ${testUser1.firstName}, your event <strong>${events[0].title}</strong> starts soon.</p>`]
      ]),
      timezone: 'UTC'
    }),
    new Reminder({
      eventId: events[1]._id,
      userId: testUser2._id,
      ticketId: tickets[1]._id,
      reminderType: '2h',
      scheduledTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      deliveryMethod: 'sms',
      status: 'failed',
      attempts: 3,
      lastError: 'SMS service temporarily unavailable',
      payload: new Map([
        ['phone', testUser2.profile?.phone],
        ['text', `Event reminder: ${events[1].title} starts in 2h. See you there!`]
      ]),
      timezone: 'UTC'
    })
  ]

  reminders.push(...sentReminders)

  // Scenario 3: Cancelled reminder
  const cancelledReminder = new Reminder({
    eventId: events[2]._id,
    userId: testUser1._id,
    ticketId: tickets[2]._id,
    reminderType: '24h',
    scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    deliveryMethod: 'email',
    status: 'cancelled',
    payload: new Map([
      ['email', testUser1.email],
      ['subject', `Reminder: ${events[2].title} starts in 24 hours`],
      ['html', `<p>Hi ${testUser1.firstName}, your event <strong>${events[2].title}</strong> starts soon.</p>`]
    ]),
    timezone: 'UTC'
  })

  reminders.push(cancelledReminder)

  // Insert all reminders
  await Reminder.insertMany(reminders)
  console.log(`Created ${reminders.length} test reminders`)

  // Summary
  const summary = {
    users: await User.countDocuments(),
    events: await Event.countDocuments(),
    orders: await Order.countDocuments(),
    tickets: await Ticket.countDocuments(),
    reminders: await Reminder.countDocuments(),
    templates: await ReminderTemplate.countDocuments()
  }

  console.log('\n=== REMINDER SEED SUMMARY ===')
  console.log('Users:', summary.users)
  console.log('Events:', summary.events)
  console.log('Orders:', summary.orders)
  console.log('Tickets:', summary.tickets)
  console.log('Reminders:', summary.reminders)
  console.log('Templates:', summary.templates)

  console.log('\n=== TEST ACCOUNTS ===')
  console.log('Test User 1: testuser1@example.com / password123')
  console.log('Test User 2: testuser2@example.com / password123')
  console.log('Organizer: organizer@example.com / password123')

  console.log('\n=== REMINDER SCENARIOS ===')
  console.log('✅ Upcoming reminders (24h, 2h, 30m) - pending status')
  console.log('✅ Sent reminders - for history view')
  console.log('✅ Failed reminders - for retry testing')
  console.log('✅ Cancelled reminders - for preference testing')

  await mongoose.disconnect()
  console.log('\nReminder seeding completed!')
}

run().catch(async (err) => {
  console.error('Reminder seed failed:', err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})
