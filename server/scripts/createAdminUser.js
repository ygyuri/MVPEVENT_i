#!/usr/bin/env node

/**
 * Create a single admin user with specified credentials
 *
 * Usage:
 *   node server/scripts/createAdminUser.js <email> <password> <name>
 *
 * Example:
 *   node server/scripts/createAdminUser.js admin@event-i.co.ke "#EventI400%" "Admin User"
 */

const mongoose = require("mongoose");
const User = require("../models/User");

// Get MongoDB URI from environment
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/event_i";

// Get arguments from command line
const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("❌ Error: Email and password are required");
  console.error("Usage: node createAdminUser.js <email> <password> [name]");
  process.exit(1);
}

const userName = name || email.split("@")[0];

async function createAdminUser() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      console.log(`\n📝 User found: ${email}`);
      console.log(`   Current role: ${user.role}`);
      console.log(`   Updating to admin role...`);

      user.role = "admin";
      user.emailVerified = true;
      user.isActive = true;
      user.accountStatus = "active";
      if (!user.name && userName) {
        user.name = userName;
      }

      await user.setPassword(password);
      await user.save();

      console.log(`   ✅ Admin user updated: ${email}`);
      console.log(`   User ID: ${user._id}`);
    } else {
      console.log(`\n📝 Creating new admin user: ${email}`);

      // Sanitize username: remove dots and replace with underscores
      const rawUsername = email.split("@")[0];
      const username = rawUsername.replace(/[^a-zA-Z0-9_]/g, "_");

      user = new User({
        email: email.toLowerCase().trim(),
        username: username,
        name: userName,
        firstName: userName,
        role: "admin",
        emailVerified: true,
        isActive: true,
        accountStatus: "active",
      });

      await user.setPassword(password);
      await user.save();

      console.log(`   ✅ Admin user created: ${email}`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Username: ${username}`);
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${userName}`);
    console.log(`   Role: admin`);
    console.log(`   Status: active`);
    console.log(`\n✅ Process completed!`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };
