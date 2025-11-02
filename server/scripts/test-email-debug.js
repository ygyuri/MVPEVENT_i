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

      // Import email branding functions
      const {
        getBrandColors,
        getEmailHeader,
        getEmailFooter,
        wrapEmailTemplate,
      } = require("../services/emailBranding");

      const colors = getBrandColors();

      // Build diagnostic email content using branding functions
      const content = `
        ${getEmailHeader(
          "✅ SMTP Configuration Verified",
          "Diagnostic test successful"
        )}
        
        <div class="content">
          <div class="greeting">SMTP Diagnostic Test Results</div>
          
          <p class="intro-text">
            Your SMTP configuration has been successfully verified and is working correctly.
          </p>
          
          <div class="card">
            <h3>Working Configuration</h3>
            <table class="table">
              <tr>
                <th>Configuration</th>
                <td>${config.name}</td>
              </tr>
              <tr>
                <th>Host</th>
                <td>${config.host}:${config.port}</td>
              </tr>
              <tr>
                <th>Secure Connection</th>
                <td>${config.secure ? "Yes (SSL/TLS)" : "No (STARTTLS)"}</td>
              </tr>
              <tr>
                <th>SMTP User</th>
                <td>${smtpUser}</td>
              </tr>
            </table>
          </div>
          
          <div class="card">
            <h3>Environment Information</h3>
            <table class="table">
              <tr>
                <th>NODE_ENV</th>
                <td>${nodeEnv}</td>
              </tr>
              <tr>
                <th>SMTP Host</th>
                <td>${process.env.SMTP_HOST || "not set"}</td>
              </tr>
              <tr>
                <th>SMTP Port</th>
                <td>${process.env.SMTP_PORT || "not set"}</td>
              </tr>
              <tr>
                <th>SMTP Secure</th>
                <td>${process.env.SMTP_SECURE || "not set"}</td>
              </tr>
              <tr>
                <th>Email From</th>
                <td>${emailFrom}</td>
              </tr>
              <tr>
                <th>App URL</th>
                <td>${appUrl}</td>
              </tr>
              <tr>
                <th>Client URL</th>
                <td>${clientUrl}</td>
              </tr>
            </table>
          </div>
          
          <div class="card">
            <h3>System Information</h3>
            <table class="table">
              <tr>
                <th>Node Version</th>
                <td>${nodeVersion}</td>
              </tr>
              <tr>
                <th>Platform</th>
                <td>${platform} (${arch})</td>
              </tr>
              <tr>
                <th>Project ID</th>
                <td>${projectId}</td>
              </tr>
              <tr>
                <th>Memory Usage</th>
                <td>${usedMemory} MB / ${totalMemory} MB</td>
              </tr>
              <tr>
                <th>Process Uptime</th>
                <td>${Math.floor(uptime / 60)} minutes</td>
              </tr>
              <tr>
                <th>Test Time</th>
                <td>${timestamp.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          ${
            dnsInfo || databaseUrl || redisUrl
              ? `
          <div class="card">
            <h3>DNS & Network</h3>
            <table class="table">
              ${
                dnsInfo
                  ? `
              <tr>
                <th>DNS Resolution</th>
                <td>${dnsInfo}</td>
              </tr>
              `
                  : ""
              }
              ${
                databaseUrl && databaseUrl !== "not set"
                  ? `
              <tr>
                <th>Database</th>
                <td>${databaseUrl}</td>
              </tr>
              `
                  : ""
              }
              ${
                redisUrl && redisUrl !== "not set"
                  ? `
              <tr>
                <th>Redis</th>
                <td>${redisUrl}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          `
              : ""
          }
          
          <div class="highlight-box">
            <h4>✅ Status</h4>
            <p style="margin: 0; color: ${colors.success}; font-weight: 600;">
              SMTP connection is working correctly. All emails will be sent using this configuration.
            </p>
          </div>
          
          <p class="intro-text" style="margin-top: 24px;">
            This is an automated diagnostic test. If you receive this email, your SMTP configuration is working properly.
          </p>
        </div>
        
        ${getEmailFooter()}
      `;

      const html = wrapEmailTemplate(
        content,
        "SMTP Diagnostic Test - Configuration Verified"
      );

      const testEmail = await transporter.sendMail({
        from: `"Event-i System" <${emailFrom}>`,
        to: "jeffomondi.eng@gmail.com, gideonyuri15@gmail.com",
        subject: "✅ SMTP Diagnostic Test - Configuration Verified",
        html,
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
