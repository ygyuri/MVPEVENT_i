#!/usr/bin/env node

/**
 * Create admin users (jeff and yuri) with random passwords
 * and send them via email
 *
 * Usage:
 *   node server/scripts/createAdminsWithEmail.js
 *
 * Environment variables required:
 *   - MONGODB_URI
 *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const emailService = require("../services/emailService");

// Get MongoDB URI from environment
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/event_i";

// List of countries for random selection
const COUNTRIES = [
  "Kenya",
  "Tanzania",
  "Uganda",
  "Rwanda",
  "Ghana",
  "Nigeria",
  "SouthAfrica",
  "Egypt",
  "Morocco",
  "Ethiopia",
  "Botswana",
  "Mozambique",
  "Zimbabwe",
  "Zambia",
  "Malawi",
  "Senegal",
  "IvoryCoast",
  "Cameroon",
  "Algeria",
  "Tunisia",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Japan",
  "China",
  "India",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
];

// Generate random password in format: #CountryYear%
function generateRandomPassword() {
  const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const randomYear = Math.floor(Math.random() * (2024 - 1980 + 1)) + 1980;
  return `#${randomCountry}${randomYear}%`;
}

// Send admin credentials email
async function sendAdminCredentialsEmail(email, password) {
  const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Account Created - Event-i</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4f0f69 0%, #6b1a8a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Admin Account Created</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your admin account has been created for Event-i. You now have full administrative access to the platform.
    </p>
    
    <div style="background: white; border: 2px solid #4f0f69; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</p>
      <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold; color: #333;">Email:</p>
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #4f0f69; word-break: break-all;">${email}</p>
      
      <p style="margin: 20px 0 5px 0; font-size: 18px; font-weight: bold; color: #333;">Password:</p>
      <div style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin: 10px 0;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #4f0f69; font-family: 'Courier New', monospace; letter-spacing: 2px; text-align: center;">${password}</p>
      </div>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Security Notice:</strong> Please save this password securely and change it after your first login. Do not share these credentials with anyone.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${frontendUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #4f0f69 0%, #6b1a8a 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(79, 15, 105, 0.3);">
        Go to Event-i Dashboard
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      You can access the admin dashboard and manage users, events, and system settings.
    </p>
    
    <p style="font-size: 14px; color: #999; margin-top: 20px;">
      If you did not request this account, please contact support immediately.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="font-size: 12px; color: #999;">
      This is an automated message from Event-i Platform.<br>
      © ${new Date().getFullYear()} Event-i. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Event-i Admin" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "🔐 Your Event-i Admin Account Credentials",
    html: html,
    text: `
Admin Account Created - Event-i

Your admin account has been created for Event-i.

Email: ${email}
Password: ${password}

Please save this password securely and change it after your first login.

Login at: ${frontendUrl}

If you did not request this account, please contact support immediately.
    `.trim(),
  };

  try {
    const result = await emailService.transporter.sendMail(mailOptions);
    console.log(`   ✅ Email sent: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`   ❌ Failed to send email:`, error.message);
    throw error;
  }
}

// Create admin user with random password
async function createAdminUserWithEmail(name, email) {
  try {
    console.log(`\n📝 Processing ${name} (${email})...`);

    // Generate random password
    const password = generateRandomPassword();
    console.log(`   Generated password: ${password}`);

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      console.log(`   Creating new admin user...`);
      // Sanitize username: remove dots and replace with underscores, ensure only alphanumeric and underscores
      const rawUsername = email.split("@")[0];
      const username = rawUsername.replace(/[^a-zA-Z0-9_]/g, "_");

      user = new User({
        email,
        username,
        name: name,
        firstName: name,
        role: "admin",
        emailVerified: true,
        isActive: true,
        accountStatus: "active",
      });

      await user.setPassword(password);
    } else {
      console.log(`   User exists. Updating to admin role...`);
      console.log(`   Current role: ${user.role}`);

      user.role = "admin";
      user.emailVerified = true;
      user.isActive = true;
      user.accountStatus = "active";
      await user.setPassword(password);
    }

    await user.save();
    console.log(`   ✅ Admin user created/updated: ${email}`);
    console.log(`   User ID: ${user._id}`);

    // Send email with credentials
    console.log(`   📧 Sending credentials email...`);
    await sendAdminCredentialsEmail(email, password);

    return { email, password, userId: user._id };
  } catch (error) {
    console.error(`   ❌ Error processing ${name}:`, error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Verify email service is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("\n❌ Error: SMTP credentials not configured");
      console.error(
        "   Please set SMTP_USER and SMTP_PASS environment variables"
      );
      process.exit(1);
    }

    console.log("📧 Email service configured");

    // Create admin users
    const admins = [
      { name: "Jeff", email: "jeffomondi.eng@gmail.com" },
      { name: "Yuri", email: "yuri@event-i.co.ke" },
    ];

    const results = [];

    for (const admin of admins) {
      try {
        const result = await createAdminUserWithEmail(admin.name, admin.email);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to create admin for ${admin.name}:`,
          error.message
        );
        results.push({ email: admin.email, error: error.message });
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));

    results.forEach((result, index) => {
      const admin = admins[index];
      if (result.error) {
        console.log(`\n❌ ${admin.name} (${result.email}): FAILED`);
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`\n✅ ${admin.name} (${result.email}): SUCCESS`);
        console.log(`   Password: ${result.password}`);
        console.log(`   User ID: ${result.userId}`);
        console.log(`   ✅ Email sent successfully`);
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ Process completed!");
    console.log("=".repeat(60));

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the script
main();
