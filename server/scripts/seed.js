/* eslint-disable no-console */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const User = require('../models/User')
const EventCategory = require('../models/EventCategory')
const Event = require('../models/Event')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i'

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

  // Seed sample events only if none exist
  const existingCount = await Event.countDocuments()
  if (existingCount === 0) {
    const tech = categoryDocs['Technology']
    const music = categoryDocs['Music']
    const business = categoryDocs['Business']

    const samples = [
      {
        organizer: organizer._id,
        title: 'Web3 Summit 2025',
        slug: slugify('Web3 Summit 2025'),
        description: 'Explore decentralized tech, DeFi, NFTs and beyond.',
        shortDescription: 'Explore decentralized tech.',
        category: tech?._id,
        location: { venueName: 'Crypto Arena', city: 'San Francisco', state: 'CA', country: 'USA' },
        dates: { startDate: daysFromNow(14), endDate: daysFromNow(16), timezone: 'UTC' },
        capacity: 800,
        pricing: { price: 199, currency: 'USD', isFree: false },
        flags: { isFeatured: true, isTrending: true },
        status: 'published',
        media: { coverImageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&q=80' },
      },
      {
        organizer: organizer._id,
        title: 'AI Workshop: Build with LLMs',
        slug: slugify('AI Workshop: Build with LLMs'),
        description: 'Hands-on workshop building with LLMs and agents.',
        shortDescription: 'Hands-on LLMs workshop.',
        category: tech?._id,
        location: { venueName: 'Tech Learning Center', city: 'San Francisco', state: 'CA', country: 'USA' },
        dates: { startDate: daysFromNow(5), endDate: daysFromNow(5), timezone: 'UTC' },
        capacity: 150,
        pricing: { price: 299, currency: 'USD', isFree: false },
        flags: { isFeatured: true },
        status: 'published',
        media: { coverImageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80' },
      },
      {
        organizer: organizer._id,
        title: 'Summer Music Festival',
        slug: slugify('Summer Music Festival'),
        description: 'A three-day celebration of music with top artists.',
        shortDescription: 'Three-day celebration of music.',
        category: music?._id,
        location: { venueName: 'LA Music Arena', city: 'Los Angeles', state: 'CA', country: 'USA' },
        dates: { startDate: daysFromNow(30), endDate: daysFromNow(32), timezone: 'UTC' },
        capacity: 5000,
        pricing: { price: 179, currency: 'USD', isFree: false },
        flags: { isFeatured: true, isTrending: true },
        status: 'published',
        media: { coverImageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80' },
      },
      {
        organizer: organizer._id,
        title: 'Startup Meetup Night',
        slug: slugify('Startup Meetup Night'),
        description: 'Network with fellow founders and investors.',
        shortDescription: 'Networking for founders and investors.',
        category: business?._id,
        location: { venueName: 'NYC Startup Hub', city: 'New York', state: 'NY', country: 'USA' },
        dates: { startDate: daysFromNow(10), endDate: daysFromNow(10), timezone: 'UTC' },
        capacity: 400,
        pricing: { price: 0, currency: 'USD', isFree: true },
        flags: { isTrending: true },
        status: 'published',
        media: { coverImageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80' },
      },
    ]

    await Event.insertMany(samples, { ordered: false })
    console.log('Inserted sample events:', samples.length)
  } else {
    console.log('Events already exist, skipping sample insertion')
  }

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
