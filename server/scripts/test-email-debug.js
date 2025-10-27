#!/usr/bin/env node

/**
 * Comprehensive SMTP Connection Diagnostics
 * Tests various aspects of the SMTP configuration
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

async function runDiagnostics() {
  console.log("🔍 SMTP Connection Diagnostics");
  console.log("=" .repeat(50));
  console.log();

  // 1. Environment Variables Check
  console.log("📋 Step 1: Environment Variables");
  console.log("-".repeat(50));
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  console.log(`SMTP_HOST: ${smtpHost}`);
  console.log(`SMTP_PORT: ${smtpPort}`);
  console.log(`SMTP_USER: ${smtpUser ? `${smtpUser.substring(0, 3)}...` : 'MISSING'}`);
  console.log(`SMTP_PASS: ${smtpPass ? '***' : 'MISSING'}`);
  console.log();

  if (!smtpUser || !smtpPass) {
    console.error("❌ Missing SMTP credentials!");
    return;
  }

  // 2. DNS Resolution Test
  console.log("📋 Step 2: DNS Resolution");
  console.log("-".repeat(50));
  const dns = require("dns");
  const { promisify } = require("util");
  const lookup = promisify(dns.lookup);
  
  try {
    const address = await lookup(smtpHost);
    console.log(`✅ ${smtpHost} resolves to: ${address.address}`);
  } catch (error) {
    console.error(`❌ DNS lookup failed: ${error.message}`);
    console.error("   This could indicate network connectivity issues");
    return;
  }
  console.log();

  // 3. Network Connectivity Test
  console.log("📋 Step 3: Network Connectivity");
  console.log("-".repeat(50));
  const net = require("net");
  
  try {
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(smtpPort, smtpHost, () => {
        console.log(`✅ Successfully connected to ${smtpHost}:${smtpPort}`);
        socket.end();
        resolve();
      });

      socket.on("error", (error) => {
        console.error(`❌ Connection failed: ${error.message}`);
        console.error(`   Error code: ${error.code}`);
        if (error.code === "ECONNREFUSED") {
          console.error("   The server is not listening on this port");
        } else if (error.code === "ETIMEDOUT") {
          console.error("   Connection timed out - check firewall rules");
        } else if (error.code === "ENOTFOUND") {
          console.error("   Hostname not found");
        }
        reject(error);
      });

      socket.setTimeout(10000, () => {
        console.error("❌ Connection timeout after 10 seconds");
        socket.destroy();
        reject(new Error("Timeout"));
      });
    });
  } catch (error) {
    console.log("⚠️ Basic connectivity test failed");
    console.log();
  }
  console.log();

  // 4. SMTP Configuration Options
  console.log("📋 Step 4: Testing Different SMTP Configurations");
  console.log("-".repeat(50));
  
  const configurations = [
    {
      name: "Standard TLS (port 587)",
      host: smtpHost,
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
    {
      name: "SSL/TLS (port 465)",
      host: smtpHost,
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
    {
      name: "Plain text (port 25 - if supported)",
      host: smtpHost,
      port: 25,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
  ];

  for (const config of configurations) {
    console.log(`Testing: ${config.name}`);
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Set a timeout for verify
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Verify timeout")), 10000)
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log(`✅ ${config.name} - Connection successful!`);
      console.log("   This configuration works!");
      console.log();
      
      // Use this working configuration for sending
      console.log("📧 Attempting to send test email with working configuration...");
      const testEmail = await transporter.sendMail({
        from: `"Event-i Test" <${smtpUser}>`,
        to: "jeffomondi.eng@gmail.com, gideonyuri15@gmail.com",
        subject: "SMTP Diagnostic Test - Event-i",
        html: `
          <h1>✅ SMTP Diagnostic Test</h1>
          <p>Configuration: ${config.name}</p>
          <p>Host: ${config.host}:${config.port}</p>
          <p>Secure: ${config.secure}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
      });

      console.log("✅ Test email sent successfully!");
      console.log(`   Message ID: ${testEmail.messageId}`);
      console.log();
      
      break; // Exit if successful
    } catch (error) {
      console.log(`❌ ${config.name} - ${error.message}`);
      console.log();
    }
  }

  console.log("📊 Diagnostic Summary");
  console.log("=" .repeat(50));
  console.log("Please review the output above for connection issues.");
  console.log();
}

runDiagnostics().catch((error) => {
  console.error("❌ Diagnostic script failed:", error.message);
  process.exit(1);
});

