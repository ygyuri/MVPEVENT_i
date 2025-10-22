/* eslint-disable no-console */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const User = require('../models/User')
const EventCategory = require('../models/EventCategory')
const Event = require('../models/Event')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin'

const categoriesSeed = [
  { name: 'Technology', description: 'Tech conferences, hackathons, and innovation events', color: '#3B82F6', icon: 'laptop' },
  { name: 'Music', description: 'Concerts, festivals, and live performances', color: '#8B5CF6', icon: 'music' },
  { name: 'Business', description: 'Networking and business meetups', color: '#10B981', icon: 'briefcase' },
  { name: 'Sports', description: 'Sports events, tournaments, and fitness activities', color: '#F59E0B', icon: 'trophy' },
  { name: 'Arts & Culture', description: 'Art, theater, and cultural events', color: '#EF4444', icon: 'palette' },
  { name: 'Food & Drink', description: 'Food festivals and tastings', color: '#F97316', icon: 'utensils' },
  { name: 'Education', description: 'Workshops, seminars, and learning events', color: '#06B6D4', icon: 'graduation-cap' },
]

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const daysFromNow = (d) => {
  const base = new Date()
  base.setDate(base.getDate() + d)
  return base
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB:', MONGODB_URI)

  // Clean any bad docs
  await EventCategory.deleteMany({ slug: { $in: [null, ''] } })
  await Event.deleteMany({ slug: { $in: [null, ''] } })

  // Ensure organizer user
  let organizer = await User.findOne({ email: 'organizer@example.com' })
  if (!organizer) {
    organizer = new User({
      email: 'organizer@example.com',
      username: 'organizer',
      firstName: 'Org',
      lastName: 'One',
      role: 'organizer',
      emailVerified: true,
    })
    await organizer.setPassword('password123')
    await organizer.save()
    console.log('Created organizer user: organizer@example.com / password123')
  } else {
    console.log('Organizer user exists')
  }

  // Upsert categories with slug
  const categoryDocs = {}
  for (const c of categoriesSeed) {
    const slug = slugify(c.name)
    let doc = await EventCategory.findOne({ slug })
    if (!doc) {
      doc = new EventCategory({ ...c, slug })
      await doc.save()
    } else {
      doc.description = c.description
      doc.color = c.color
      doc.icon = c.icon
      doc.isActive = true
      await doc.save()
    }
    categoryDocs[c.name] = doc
  }

  // Production: No sample events - start with clean slate
  console.log('Production mode: Skipping sample event creation')

  const counts = {
    users: await User.countDocuments(),
    categories: await EventCategory.countDocuments(),
    events: await Event.countDocuments(),
  }
  console.log('Seed completed:', counts)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('Seed failed:', err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})
