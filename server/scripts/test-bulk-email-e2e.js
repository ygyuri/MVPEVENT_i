#!/usr/bin/env node
/**
 * End-to-end test: simulates frontend bulk email flow via API.
 * 1. Login as admin
 * 2. Get events, pick one with attendees
 * 3. Get attendees for that event
 * 4. Create draft, then send
 * 5. Poll status until completed; verify emails sent
 *
 * Usage:
 *   BASE_URL=http://localhost:5001 node server/scripts/test-bulk-email-e2e.js
 *   (from repo root; or cd server && BASE_URL=http://localhost:5001 node scripts/test-bulk-email-e2e.js)
 *
 * Env: BASE_URL (default http://localhost:5001), TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || process.env.API_URL || "http://localhost:5001";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@test.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "password123";

async function request(method, url, body = null, token = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data.error || data.message || res.statusText || res.status);
  return data;
}

async function main() {
  console.log("🧪 Bulk Email E2E Test\n");
  console.log("BASE_URL:", BASE_URL);
  console.log("Admin:", ADMIN_EMAIL, "\n");

  let token;

  // 1. Login
  console.log("1. Login as admin...");
  try {
    const loginRes = await request("POST", `${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    token = loginRes.tokens?.accessToken || loginRes.accessToken;
    if (!token) throw new Error("No token in login response");
    console.log("   ✅ Logged in\n");
  } catch (e) {
    console.error("   ❌ Login failed:", e.message);
    console.log("   Ensure an admin user exists (e.g. run seed or seedLocalData) and TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD match.");
    process.exit(1);
  }

  // 2. Get events
  console.log("2. Fetch admin events...");
  let eventsRes;
  try {
    eventsRes = await request("GET", `${BASE_URL}/api/admin/events?limit=50`, null, token);
  } catch (e) {
    console.error("   ❌ Events failed:", e.message);
    process.exit(1);
  }
  const events = eventsRes.data?.events || eventsRes.events || [];
  if (!events.length) {
    console.log("   ❌ No events found. Create an event first (and ensure it has orders/tickets for attendees).");
    process.exit(1);
  }
  console.log("   ✅ Found", events.length, "event(s)\n");

  // 3. Get attendees for first event (or first with attendees)
  let eventId;
  let attendees = [];
  for (const ev of events) {
    const id = ev._id || ev.id;
    const attRes = await request("GET", `${BASE_URL}/api/admin/communications/attendees?eventId=${id}&limit=20`, null, token);
    const list = attRes.data?.attendees || attRes.attendees || [];
    if (list.length > 0) {
      eventId = id;
      attendees = list;
      console.log("3. Attendees for event:", ev.title || id);
      console.log("   ✅ Found", attendees.length, "attendee(s)\n");
      break;
    }
  }
  if (!eventId || !attendees.length) {
    console.log("3. No attendees found for any event.");
    console.log("   Create an event, add orders/tickets, then re-run.");
    process.exit(1);
  }

  const recipientIds = attendees.slice(0, 5).map((a) => a._id || a.id);

  // 4. Create draft
  console.log("4. Create draft...");
  let draft;
  try {
    const draftRes = await request("POST", `${BASE_URL}/api/admin/communications/drafts`, {
      subject: "E2E Test " + new Date().toISOString(),
      bodyHtml: "This is an automated end-to-end test. If you received this, the bulk email flow works.",
      eventId,
      recipientType: "attendees",
      recipientIds,
      attachments: [],
    }, token);
    draft = draftRes.data || draftRes;
    if (!draft?._id) throw new Error("No draft id");
    console.log("   ✅ Draft id:", draft._id, "\n");
  } catch (e) {
    console.error("   ❌ Create draft failed:", e.message);
    process.exit(1);
  }

  // 5. Send
  console.log("5. Trigger send (enqueue job)...");
  try {
    await request("POST", `${BASE_URL}/api/admin/communications/${draft._id}/send`, null, token);
    console.log("   ✅ Send enqueued\n");
  } catch (e) {
    console.error("   ❌ Send failed:", e.message);
    console.log("   (If Redis is not connected, bulk email will not process.)");
    process.exit(1);
  }

  // 6. Poll status
  console.log("6. Poll status until completed (max 90s)...");
  const pollInterval = 2500;
  const maxWait = 90000;
  const start = Date.now();
  let statusRes;
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));
    try {
      statusRes = await request("GET", `${BASE_URL}/api/admin/communications/${draft._id}/status`, null, token);
    } catch (e) {
      console.log("   Poll error:", e.message);
      continue;
    }
    const data = statusRes.data || statusRes;
    const { status, total, sent, failed } = data;
    console.log("   ", new Date().toISOString(), "| status:", status, "| sent:", sent, "| failed:", failed, "| total:", total);
    if (status === "completed" || (total > 0 && sent + failed >= total)) {
      break;
    }
  }

  const data = (statusRes?.data || statusRes) || {};
  const { status, total, sent, failed } = data;
  console.log("\n" + "=".repeat(50));
  if (total != null && sent != null) {
    if (sent >= 1) {
      console.log("✅ E2E PASSED: At least one email sent. sent:", sent, "failed:", failed, "total:", total);
    } else if (total === 0) {
      console.log("⚠️ No recipients processed (total 0). Check recipient list.");
    } else {
      console.log("❌ E2E FAILED: No emails sent. sent:", sent, "failed:", failed, "total:", total);
      if (data.errors?.length) console.log("   Errors:", data.errors.slice(0, 3));
      process.exit(1);
    }
  } else {
    console.log("⚠️ Could not read final status. Check server logs and Redis.");
    process.exit(1);
  }

  if (status === "queued" && sent === 0 && total > 0) {
    console.log("\n💡 Job stayed 'queued' – bulk email worker may not be running.");
    console.log("   Restart the server so the worker starts after Redis (see server index.js).");
    console.log("   In Docker: ensure REDIS_URL=redis://redis:6379 and server depends_on redis (service_healthy).");
  }

  console.log("=".repeat(50) + "\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
