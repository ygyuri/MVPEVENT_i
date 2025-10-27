#!/usr/bin/env node

/**
 * Test SMTP Email Connection
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmailConnection() {
  try {
    console.log("🧪 Testing SMTP Connection...\n");

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    console.log("📡 Verifying SMTP connection...");
    await transporter.verify();

    console.log("✅ SMTP connection successful!\n");
    console.log("📧 Email Configuration:");
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`\n🌐 View emails at: https://ethereal.email/messages`);
    console.log(
      `   Login: ${process.env.SMTP_USER} / ${process.env.SMTP_PASS}\n`
    );

    // Send test email
    console.log("📨 Sending test email...");

    const testEmail = await transporter.sendMail({
      from: `"Event-i Test" <${process.env.SMTP_USER}>`,
      to: "test@example.com",
      subject: "Test Email from Event-i",
      html: `
        <h1>✅ SMTP Test Successful!</h1>
        <p>This is a test email from Event-i platform.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    console.log("✅ Test email sent successfully!");
    console.log(`   Message ID: ${testEmail.messageId}`);
    console.log(
      `\n🔗 View email: ${nodemailer.getTestMessageUrl(testEmail)}\n`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ SMTP Test Failed:");
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }
}

testEmailConnection();
