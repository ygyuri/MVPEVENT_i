#!/usr/bin/env node
/**
 * Test bulk email flow: Redis, SMTP, and one test email.
 * Run from repo root: node server/scripts/test-bulk-email-send.js
 * Or from server/: node scripts/test-bulk-email-send.js
 */

const path = require("path");
const dotenv = require("dotenv");
// Load .env from server/ or project root
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const redisManager = require("../config/redis");
const emailProvider = require("../services/communications/emailProvider");

async function main() {
  console.log("🧪 Bulk Email Send Test\n");
  console.log("1. Redis");
  await redisManager.connect();
  const redisOk = redisManager.isRedisAvailable();
  if (redisOk) {
    console.log("   ✅ Redis connected (REDIS_URL is set and Redis is running)");
  } else {
    console.log("   ❌ Redis NOT connected - bulk email jobs will NOT be processed.");
    console.log("   Set REDIS_URL (e.g. redis://localhost:6379) and ensure Redis is running.");
  }

  console.log("\n2. SMTP config");
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? "***" : "(missing)";
  if (!host || !user || !process.env.SMTP_PASS) {
    console.log("   ❌ SMTP missing: SMTP_HOST, SMTP_USER, SMTP_PASS required");
    console.log("   Current: SMTP_HOST=" + host + " SMTP_PORT=" + port + " SMTP_USER=" + user + " SMTP_PASS=" + pass);
  } else {
    console.log("   SMTP_HOST=" + host + " SMTP_PORT=" + port + " SMTP_USER=" + user + " SMTP_PASS=" + pass);
  }

  console.log("\n3. Send one test email (via bulk email provider)");
  const testTo = process.env.SMTP_USER || "test@example.com";
  try {
    await emailProvider.sendEmail({
      to: testTo,
      subject: "Bulk Email Test " + new Date().toISOString(),
      bodyHtml: "<p>This is a test from the bulk email send script.</p><p>If you see this, SMTP is working.</p>",
    });
    console.log("   ✅ Test email sent to " + testTo);
    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes("ethereal")) {
      console.log("   View at: https://ethereal.email/messages (login with SMTP_USER / SMTP_PASS)");
    }
  } catch (err) {
    console.log("   ❌ Test email failed:", err.message);
  }

  console.log("\n" + "=".repeat(50));
  if (redisOk) {
    console.log("Redis: OK – bulk email jobs will run when you click Send.");
  } else {
    console.log("Redis: NOT connected – fix REDIS_URL and restart the server so bulk emails run.");
  }
  console.log("=".repeat(50) + "\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
