/* eslint-disable no-console */
const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const User = require('../models/User')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i'

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Update test users with proper passwords
  const testUsers = [
    { email: 'testuser1@example.com', password: 'password123' },
    { email: 'testuser2@example.com', password: 'password123' },
    { email: 'organizer@example.com', password: 'password123' }
  ]

  for (const { email, password } of testUsers) {
    const user = await User.findOne({ email })
    if (user) {
      await user.setPassword(password)
      await user.save()
      console.log(`✅ Updated password for ${email}`)
    } else {
      console.log(`❌ User ${email} not found`)
    }
  }

  console.log('\n🎉 All test user passwords updated!')
  console.log('You can now login with:')
  console.log('- testuser1@example.com / password123')
  console.log('- testuser2@example.com / password123')
  console.log('- organizer@example.com / password123')

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('Failed:', err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})

