#!/usr/bin/env node

/**
 * Reset all admin user passwords to a known value
 * Usage: node server/scripts/resetAdminPasswords.js [password]
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
const NEW_PASSWORD = process.argv[2] || 'admin123';

async function resetAdminPasswords() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.log('❌ No admin users found');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📝 Resetting passwords for ${admins.length} admin user(s)...\n`);

    for (const admin of admins) {
      await admin.setPassword(NEW_PASSWORD);
      await admin.save();
      console.log(`✅ Reset password for: ${admin.email}`);
    }

    console.log(`\n✅ All admin passwords reset to: ${NEW_PASSWORD}`);
    console.log('\n📋 Admin accounts you can now login with:');
    admins.forEach(admin => {
      console.log(`   - ${admin.email} / ${NEW_PASSWORD}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  resetAdminPasswords();
}

module.exports = { resetAdminPasswords };

