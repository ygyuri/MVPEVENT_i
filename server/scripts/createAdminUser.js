#!/usr/bin/env node

/**
 * Create or update a user to have admin role
 * 
 * Usage:
 *   node server/scripts/createAdminUser.js <email> [password]
 * 
 * Examples:
 *   # Update existing user to admin (keeps existing password)
 *   node server/scripts/createAdminUser.js admin@example.com
 * 
 *   # Create new admin user or update existing with new password
 *   node server/scripts/createAdminUser.js admin@example.com newpassword123
 */

const mongoose = require('mongoose');
const User = require('../models/User');

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_i';

async function createAdminUser(email, password = null) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find existing user
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log(`📝 User ${email} not found. Creating new admin user...`);
      
      // Extract username from email if not provided
      const username = email.split('@')[0];
      
      user = new User({
        email,
        username,
        role: 'admin',
        emailVerified: true,
        isActive: true,
        accountStatus: 'active',
      });
      
      if (password) {
        await user.setPassword(password);
        console.log('   ✅ Password set');
      } else {
        console.log('   ⚠️  No password provided. User will need to use password reset.');
      }
      
    } else {
      console.log(`📝 User ${email} found. Updating to admin role...`);
      console.log(`   Current role: ${user.role}`);
      
      user.role = 'admin';
      user.emailVerified = true;
      user.isActive = true;
      user.accountStatus = 'active';
      
      if (password) {
        await user.setPassword(password);
        console.log('   ✅ Password updated');
      } else {
        console.log('   ℹ️  Password not changed (existing password remains)');
      }
    }

    await user.save();
    
    console.log('\n✅ Admin user created/updated successfully!');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   User ID:', user._id);
    console.log('   Email Verified:', user.emailVerified);
    console.log('   Active:', user.isActive);
    
    if (!password && !user.passwordHash) {
      console.log('\n⚠️  WARNING: User has no password set. They will need to use password reset to login.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 11000) {
      console.error('   This email or username is already in use by another account.');
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Parse command line arguments
const [,, email, password] = process.argv;

if (!email) {
  console.error('❌ Error: Email is required\n');
  console.error('Usage: node server/scripts/createAdminUser.js <email> [password]');
  console.error('\nExamples:');
  console.error('  # Update existing user to admin (keep existing password)');
  console.error('  node server/scripts/createAdminUser.js admin@example.com');
  console.error('\n  # Create new admin or update with new password');
  console.error('  node server/scripts/createAdminUser.js admin@example.com newpassword123');
  process.exit(1);
}

// Validate email format (basic)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Run the script
createAdminUser(email, password);

