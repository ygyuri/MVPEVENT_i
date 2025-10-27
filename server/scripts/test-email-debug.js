#!/usr/bin/env node

/**
 * Comprehensive SMTP Connection Diagnostics
 * Tests various aspects of the SMTP configuration
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

async function runDiagnostics() {
  console.log("🔍 SMTP Connection Diagnostics");
  console.log("=".repeat(50));
  console.log();

  // 1. Environment Variables Check
  console.log("📋 Step 1: Environment Variables");
  console.log("-".repeat(50));

  // Require all environment variables to be set - no fallbacks
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  console.log(`SMTP_HOST: ${smtpHost || "MISSING"}`);
  console.log(`SMTP_PORT: ${smtpPort || "MISSING"}`);
  console.log(
    `SMTP_USER: ${smtpUser ? `${smtpUser.substring(0, 3)}...` : "MISSING"}`
  );
  console.log(`SMTP_PASS: ${smtpPass ? "***" : "MISSING"}`);
  console.log();

  // Validate all required environment variables
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error("❌ Missing required SMTP environment variables!");
    console.error(
      "   Make sure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are set"
    );
    console.error("   Check .env file and ensure it's loaded correctly");
    process.exit(1);
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
      name: `Configured Port ${smtpPort}`,
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
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
      console.log(
        "📧 Attempting to send test email with working configuration..."
      );

      // Gather comprehensive information for the diagnostic email
      const timestamp = new Date();
      const nodeVersion = process.version;
      const platform = process.platform;
      const arch = process.arch;
      const nodeEnv = process.env.NODE_ENV || "not set";
      const emailFrom = process.env.EMAIL_FROM || smtpUser;

      // Gather DNS information
      let dnsInfo = "Not available";
      try {
        const dns = require("dns");
        const { promisify } = require("util");
        const lookup = promisify(dns.lookup);
        const address = await lookup(smtpHost);
        dnsInfo = `${smtpHost} → ${address.address}`;
      } catch (e) {
        dnsInfo = `Failed to resolve: ${e.message}`;
      }

      // Additional environment info
      const projectId = process.env.PROJECT_ID || "not set";
      const databaseUrl = process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.substring(0, 20)}...`
        : "not set";
      const redisUrl = process.env.REDIS_URL
        ? `${process.env.REDIS_URL.substring(0, 20)}...`
        : "not set";
      const appUrl = process.env.APP_URL || "not set";
      const clientUrl = process.env.CLIENT_URL || "not set";

      // Memory info
      const totalMemory = Math.round(
        process.memoryUsage().heapTotal / 1024 / 1024
      );
      const usedMemory = Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      );
      const uptime = Math.round(process.uptime());

      const testEmail = await transporter.sendMail({
        from: `"Event-i System" <${emailFrom}>`,
        to: "jeffomondi.eng@gmail.com, gideonyuri15@gmail.com",
        subject: "✅ SMTP Diagnostic Test - Configuration Verified",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2ecc71;">✅ SMTP Configuration Verified</h1>
            
            <h2 style="color: #3498db;">Working Configuration</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Configuration</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  config.name
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Host</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  config.host
                }:${config.port}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Secure Connection</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  config.secure ? "Yes (SSL/TLS)" : "No (STARTTLS)"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SMTP User</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${smtpUser}</td>
              </tr>
            </table>
            
            <h2 style="color: #3498db;">Environment Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">NODE_ENV</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${nodeEnv}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Node Version</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${nodeVersion}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Platform</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${platform} (${arch})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Project ID</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${projectId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email From</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${emailFrom}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">App URL</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${appUrl}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client URL</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${clientUrl}</td>
              </tr>
            </table>
            
            <h2 style="color: #3498db;">DNS & Network</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">DNS Resolution</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${dnsInfo}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Database</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${databaseUrl}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Redis</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${redisUrl}</td>
              </tr>
            </table>
            
            <h2 style="color: #3498db;">System Resources</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Memory Usage</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${usedMemory} MB / ${totalMemory} MB</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Process Uptime</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${uptime} seconds</td>
              </tr>
            </table>
            
            <h2 style="color: #3498db;">Test Results</h2>
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p style="margin: 0; color: #155724;">✅ SMTP connection verified successfully</p>
              <p style="margin: 0; color: #155724;">✅ Email sending capability confirmed</p>
            </div>
            
            <h2 style="color: #3498db;">Timestamps</h2>
            <p><strong>Local Time:</strong> ${timestamp.toLocaleString()}</p>
            <p><strong>UTC Time:</strong> ${timestamp.toUTCString()}</p>
            <p><strong>ISO:</strong> ${timestamp.toISOString()}</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">
              This is an automated diagnostic test from the Event-i production server.<br>
              If you received this email, your SMTP configuration is working correctly.
            </p>
          </div>
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
  console.log("=".repeat(50));
  console.log("Please review the output above for connection issues.");
  console.log();
}

runDiagnostics().catch((error) => {
  console.error("❌ Diagnostic script failed:", error.message);
  process.exit(1);
});
