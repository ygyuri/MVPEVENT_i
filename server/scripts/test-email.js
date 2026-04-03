#!/usr/bin/env node

/**
 * Test SMTP Email Connection
 */

require("dotenv").config();
const nodemailer = require("nodemailer");
const {
  loadDeployContext,
  buildDeployContextHtmlBlock,
} = require("./deployEmailContextLib");

async function testEmailConnection() {
  try {
    console.log("🧪 Testing SMTP Connection...\n");

    // Create transporter with smart port handling
    const smtpHost = process.env.SMTP_HOST || "smtp.ethereal.email";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    
    // Port 465 uses SSL, other ports use STARTTLS
    const isSecure = smtpPort === 465;
    
    console.log(`Configuration: ${smtpHost}:${smtpPort} (secure: ${isSecure})`);
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add timeout settings to catch "greeting never received" faster
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
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

    const deployCtx = loadDeployContext();
    const deploySection = buildDeployContextHtmlBlock(deployCtx);

    // Generate security headers
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const supportEmail = process.env.SMTP_USER || "noreply@event-i.com";
    const securityHeaders = {
      "X-Mailer": "Event-i Platform v1.0",
      "X-Auto-Response-Suppress": "All",
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      "Precedence": "bulk",
      "List-Id": "<event-tickets.event-i.com>",
      "List-Unsubscribe": `<${frontendUrl}/unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Return-Path": supportEmail,
      "Sender": supportEmail,
      "Message-ID": `<${Date.now()}@event-i.com>`,
      "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const testEmail = await transporter.sendMail({
      from: `"Event-i Test" <${process.env.SMTP_USER}>`,
      to: "ochiengemmanuel242@gmail.com, rndonjimusandu@gmail.com, gideonyuri15@gmail.com",
      subject: deployCtx
        ? `Test Email from Event-i (deploy ${deployCtx.shortSha || deployCtx.sha?.slice(0, 7) || ""})`
        : "Test Email from Event-i",
      html: `
        <h1>✅ SMTP Test Successful!</h1>
        <p>This is a test email from the Event-i platform after a production deploy health check.</p>
        ${deploySection}
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
      headers: securityHeaders
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
