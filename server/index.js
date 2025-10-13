const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

// Initialize Redis connection manager
const redisManager = require("./config/redis");

// Import models (must be imported before routes)
require("./models/User");
require("./models/Event");
require("./models/EventCategory");
require("./models/EventTag");
require("./models/Order");
require("./models/Ticket");
require("./models/EventStaff");
require("./models/ScanLog");
require("./models/Reminder");
require("./models/ReminderTemplate");
require("./models/Poll");
require("./models/PollVote");
// Affiliate module models
require("./models/MarketingAgency");
require("./models/AffiliateMarketer");
require("./models/EventCommissionConfig");
require("./models/ReferralLink");
require("./models/ReferralClick");
require("./models/ReferralConversion");
require("./models/AffiliatePayout");
require("./models/AffiliatePerformanceCache");
require("./models/FraudDetectionLog");

// Inspect runtime schema to verify 'tags' type once models are loaded
try {
  const Event = require("./models/Event");
  const tagsPath = Event.schema.path("tags");
  const tagsType =
    tagsPath?.instance || tagsPath?.caster?.instance || "unknown";
  console.log(
    "🧩 [BOOT] Event.tags schema type:",
    tagsType,
    "options:",
    tagsPath?.options || {}
  );
} catch (e) {
  console.warn("⚠️ [BOOT] Unable to inspect Event.tags schema:", e?.message);
}

// Import routes
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const orderRoutes = require("./routes/orders");
const testRoutes = require("./routes/test");
const payheroRoutes = require("./routes/payhero");
const ticketRoutes = require("./routes/tickets");
const pollsSimpleRoutes = require("./routes/polls-simple");

const app = express();
const PORT = process.env.PORT || 5000;

// Disable ETag in development to avoid 304 Not Modified on API JSON
if (process.env.NODE_ENV !== "production") {
  app.set("etag", false);
}

// Middleware
app.use(helmet());

// Trust proxy for rate limiting behind nginx
app.set("trust proxy", true);

// In development, allow all origins to simplify mobile testing on LAN
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: (origin, callback) => callback(null, true),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
} else {
  // In production, keep a strict allowlist
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Click tracking middleware (before routes)
const {
  logClickAndSetCookie,
  clickLimiter,
} = require("./middleware/referralTracking");
app.use(clickLimiter);
app.use(logClickAndSetCookie);

// Make Socket.io available on req once it's initialized (set later)
app.use((req, res, next) => {
  if (!req.io && req.app?.locals?.io) {
    req.io = req.app.locals.io;
  }
  next();
});

// Disable browser/proxy caching for API responses in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");
    }
    next();
  });
}

// Database connections
const { connectMongoDB, connectRedis } = require("./config/database");
const databaseIndexes = require("./services/databaseIndexes");

// Connect to databases
const initializeDatabases = async () => {
  await connectMongoDB();
  await connectRedis();

  // Create analytics indexes for performance
  try {
    await databaseIndexes.createAnalyticsIndexes();
  } catch (error) {
    console.warn("⚠️ Failed to create analytics indexes:", error.message);
  }
};

if (process.env.NODE_ENV !== "test") {
  initializeDatabases();
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Event-i API is running",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Admin routes (protected)
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

// Organizer routes (protected)
const organizerRoutes = require("./routes/organizer");
app.use("/api/organizer", organizerRoutes);
const marketingAgenciesRoutes = require("./routes/marketing-agencies");
app.use("/api/organizer", marketingAgenciesRoutes);

// Analytics routes (protected)
const analyticsRoutes = require("./routes/analytics");
app.use("/api/organizer/analytics", analyticsRoutes);

// User routes (protected)
const userRoutes = require("./routes/user");
app.use("/api/user", userRoutes);

// Affiliate routes
const affiliatesRoutes = require("./routes/affiliates");
app.use("/api", affiliatesRoutes);
// Referral link routes
const referralLinkRoutes = require("./routes/referral-links");
app.use("/api", referralLinkRoutes);
// Affiliate analytics routes
const affiliatesAnalyticsRoutes = require("./routes/affiliates-analytics");
app.use("/api", affiliatesAnalyticsRoutes);
// Organizer affiliate analytics routes
const organizerAffiliateAnalyticsRoutes = require("./routes/organizer-affiliate-analytics");
app.use("/api", organizerAffiliateAnalyticsRoutes);
// Payout routes
const payoutRoutes = require("./routes/payouts");
app.use("/api", payoutRoutes);

// Order routes
app.use("/api/orders", orderRoutes);
// PayHero routes
app.use("/api/payhero", payheroRoutes);

// Ticket routes
app.use("/api/tickets", ticketRoutes);

// Reminder routes
const reminderRoutes = require("./routes/reminders");
app.use("/api/reminders", reminderRoutes);

// Updates routes
const updatesRoutes = require("./routes/updates");
app.use("/api", updatesRoutes);

// Poll routes (mount at /api so route file can expose /events/:eventId/polls and /polls/:pollId)
const pollRoutes = require("./routes/polls");
app.use("/api", pollRoutes);

// Simple polls routes (no Redis dependency)
app.use("/api", pollsSimpleRoutes);

// Push registration routes
const pushRoutes = require("./routes/push");
app.use("/api/push", pushRoutes);

// Debug auth routes (development only)
if (process.env.NODE_ENV !== "production") {
  const debugAuthRoutes = require("./routes/debug-auth");
  app.use("/api/debug", debugAuthRoutes);

  // Affiliate debug routes
  const affiliateDebugRoutes = require("./routes/affiliate-debug");
  app.use("/api/debug", affiliateDebugRoutes);
}

// Test routes
app.use("/api/test", testRoutes);

// Event routes
app.use("/api/events", eventRoutes);
// Commission config routes (under /api)
const commissionConfigRoutes = require("./routes/commission-config");
app.use("/api", commissionConfigRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Initialize Socket.io server with Redis adapter (skip in tests)
let httpServer;
if (process.env.NODE_ENV !== "test") {
  try {
    const { initializeSocket } = require("./realtime/socket");
    const { setBroadcast } = require("./realtime/socketInstance");
    const { server, io, broadcastUpdate } = initializeSocket(app);
    httpServer = server;
    // Store io for earlier middleware to pick up per-request
    app.locals.io = io;
    setBroadcast(broadcastUpdate);
    console.log("🔌 Socket.io server initialized");
  } catch (e) {
    console.warn("⚠️ Failed to initialize Socket.io:", e?.message);
  }
}

// 404 handler (after Socket.io initialization)
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start the server
if (process.env.NODE_ENV !== "test") {
  const runner = httpServer || app;
  runner.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    if (httpServer) {
      console.log(
        `🔌 WebSocket available at: http://localhost:${PORT}/socket.io/`
      );
    }

    // Initialize Redis connection
    try {
      await redisManager.connect();
    } catch (error) {
      console.warn(
        "⚠️ Redis initialization failed, continuing without Redis:",
        error.message
      );
    }
  });
}

// Start background schedulers (non-blocking)
if (process.env.NODE_ENV !== "test") {
  try {
    const {
      startReminderScanner,
    } = require("./services/scheduler/reminderScanner");
    startReminderScanner();
    console.log("⏰ Reminder scanner started (hourly)");
    // Start performance cache refresher (every 15 minutes for today)
    const { startScheduler } = require("./jobs/refreshPerformanceCache");
    startScheduler();
    console.log("📈 Affiliate performance cache refresher started (15 min)");
  } catch (e) {
    console.warn("⚠️ Failed to start reminder scanner:", e?.message);
  }
}

// Export app for testing
module.exports = app;
