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

  // Get or create customer@example.com
  let customer = await User.findOne({ email: 'admin@eventi.com' })
  
  if (!customer) {
    console.log('admin@eventi.com not found, creating...')
    customer = new User({
      email: 'admin@eventi.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      emailVerified: true,
      isActive: true,
      profile: {
        phone: '+1234567890',
        city: 'San Francisco',
        country: 'USA'
      }
    })
    await customer.setPassword('admin123')
    await customer.save()
    console.log('✅ Created admin@eventi.com / admin123')
  } else {
    console.log('✅ Using existing cccadmin@eventi.com')
    // Ensure password is set
    await customer.setPassword('admin123')
    await customer.save()
    console.log('✅ Password updated to: admin123')
  }

  // Get events
  const events = await Event.find({ status: 'published' }).limit(3)
  if (events.length === 0) {
    console.error('No events found. Run main seed script first.')
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`Found ${events.length} events`)

  // Clean existing test data for this user
  await Order.deleteMany({ 'customer.email': customer.email })
  await Ticket.deleteMany({ ownerUserId: customer._id })
  await Reminder.deleteMany({ userId: customer._id })
  console.log('Cleaned existing test data for admin@eventi.com')

  // Create test orders and tickets
  const orders = []
  const tickets = []

  for (let i = 0; i < Math.min(3, events.length); i++) {
    const event = events[i]

    // Create order
    const order = new Order({
      orderNumber: generateOrderNumber(),
      customerInfo: {
        userId: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.profile?.phone || '+1234567890'
      },
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.profile?.phone || '+1234567890'
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
      ownerUserId: customer._id,
      holder: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.profile?.phone || '+1234567890'
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
      }
    ]
    await ReminderTemplate.insertMany(templates)
    console.log(`✅ Created ${templates.length} reminder templates`)
  }

  // Create reminders for the admin user
  const reminders = []

  for (let i = 0; i < Math.min(2, events.length); i++) {
    const event = events[i]
    const ticket = tickets[i]
    const eventStart = new Date(event.dates.startDate)

    // 24h reminder (pending)
    reminders.push(new Reminder({
      eventId: event._id,
      userId: customer._id,
      ticketId: ticket._id,
      reminderType: '24h',
      scheduledTime: new Date(eventStart.getTime() - 24 * 60 * 60 * 1000),
      deliveryMethod: 'email',
      status: 'pending',
      payload: new Map([
        ['email', customer.email],
        ['subject', `Reminder: ${event.title} starts in 24 hours`],
        ['html', `<p>Hi ${customer.firstName}, your event <strong>${event.title}</strong> starts at ${eventStart.toLocaleString()}.</p>`]
      ]),
      timezone: 'UTC'
    }))

    // 2h reminder (pending)
    reminders.push(new Reminder({
      eventId: event._id,
      userId: customer._id,
      ticketId: ticket._id,
      reminderType: '2h',
      scheduledTime: new Date(eventStart.getTime() - 2 * 60 * 60 * 1000),
      deliveryMethod: 'both',
      status: 'pending',
      payload: new Map([
        ['email', customer.email],
        ['phone', customer.profile?.phone],
        ['subject', `Reminder: ${event.title} starts in 2 hours`],
        ['html', `<p>Hi ${customer.firstName}, your event <strong>${event.title}</strong> starts soon!</p>`]
      ]),
      timezone: 'UTC'
    }))

    // 30m reminder (pending)
    reminders.push(new Reminder({
      eventId: event._id,
      userId: customer._id,
      ticketId: ticket._id,
      reminderType: '30m',
      scheduledTime: new Date(eventStart.getTime() - 30 * 60 * 1000),
      deliveryMethod: 'sms',
      status: 'pending',
      payload: new Map([
        ['phone', customer.profile?.phone],
        ['text', `Event reminder: ${event.title} starts in 30min!`]
      ]),
      timezone: 'UTC'
    }))
  }

  // Add some sent/failed reminders for history
  if (events.length > 0) {
    reminders.push(new Reminder({
      eventId: events[0]._id,
      userId: customer._id,
      ticketId: tickets[0]._id,
      reminderType: '24h',
      scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveryMethod: 'email',
      status: 'sent',
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      payload: new Map([
        ['email', customer.email],
        ['subject', `Reminder: ${events[0].title} starts in 24 hours`]
      ]),
      timezone: 'UTC'
    }))
  }

  await Reminder.insertMany(reminders)
  console.log(`✅ Created ${reminders.length} reminders`)

  const summary = {
    user: customer.email,
    orders: orders.length,
    tickets: tickets.length,
    reminders: await Reminder.countDocuments({ userId: customer._id })
  }

  console.log('\n=== SUCCESS ===')
  console.log('Login with:')
  console.log('📧 Email: admin@eventi.com')
  console.log('🔑 Password: admin123')
  console.log('')
  console.log('Test data summary:', summary)
  console.log('\n✅ You can now test:')
  console.log('  - /preferences/reminders (manage upcoming reminders)')
  console.log('  - /preferences/reminders (manage upcoming reminders)')
  console.log('  - /reminders/history (view sent/failed reminders)')
  console.log('  - Checkout flow with inline reminder setup')

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('Failed:', err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})

