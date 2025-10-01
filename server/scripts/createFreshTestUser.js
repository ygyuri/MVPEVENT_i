const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Delete and recreate testuser1
  await User.deleteOne({ email: 'fresh@test.com' });
  
  const freshUser = new User({
    email: 'fresh@test.com',
    username: 'freshtest',
    firstName: 'Fresh',
    lastName: 'Test',
    role: 'customer',
    emailVerified: true,
    isActive: true,
    profile: {
      phone: '+1234567890',
      city: 'Test City',
      country: 'USA'
    }
  });

  await freshUser.setPassword('test123');
  await freshUser.save();

  console.log('✅ Created fresh test user:');
  console.log('Email: fresh@test.com');
  console.log('Password: test123');
  console.log('');
  console.log('User details:', {
    email: freshUser.email,
    hasPassword: !!freshUser.passwordHash,
    isActive: freshUser.isActive
  });

  await mongoose.disconnect();
}

run().catch(console.error);

