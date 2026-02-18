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
require("./models/TransactionFee");

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
// Use 1 to trust only the first proxy (nginx), not true (too permissive)
// This must be set BEFORE any rate limiting middleware
app.set("trust proxy", 1);

// Log startup configuration
console.log("🚀 [STARTUP] Event-i Server Initializing...");
console.log("📋 [CONFIG] Environment:", process.env.NODE_ENV || "development");
console.log("📋 [CONFIG] Port:", PORT);
console.log("📋 [CONFIG] Trust Proxy:", app.get("trust proxy"));
console.log("📋 [CONFIG] Node Version:", process.version);

// CORS Configuration - Environment-aware
const getAllowedOrigins = () => {
  const baseOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    // Allow access from local network IPs (for mobile testing)
    "http://192.168.100.34:3001",
    "http://192.168.100.34:3000",
  ];

  // Add production domains from environment
  if (process.env.FRONTEND_URL) {
    baseOrigins.push(process.env.FRONTEND_URL);
  }

  if (process.env.BASE_URL) {
    baseOrigins.push(process.env.BASE_URL);
  }

  // Add common production domains
  const productionDomains = [
    "https://event-i.co.ke",
    "https://www.event-i.co.ke",
    "https://eventi.co.ke",
    "https://www.eventi.co.ke",
  ];

  // Only add production domains if we're in production
  if (process.env.NODE_ENV === "production") {
    baseOrigins.push(...productionDomains);
  }

  return baseOrigins;
};

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
  // In production, use strict allowlist with environment-aware domains
  const allowedOrigins = getAllowedOrigins();

  console.log("🔒 CORS Configuration - Allowed Origins:", allowedOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.warn(`🚫 CORS blocked request from origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging middleware (production-safe)
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  if (process.env.NODE_ENV === "production") {
    // Minimal logging in production
    console.log(`📥 [REQUEST] ${req.method} ${req.path}`);
  } else {
    // Detailed logging in development
    console.log(`📥 [REQUEST] ${req.method} ${req.path}`, {
      origin: req.get("origin"),
      userAgent: req.get("user-agent")?.substring(0, 50),
    });
  }

  // Log response when finished
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    if (res.statusCode >= 400) {
      console.error(
        `📤 [RESPONSE] ${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`
      );
    } else if (process.env.NODE_ENV !== "production") {
      console.log(
        `📤 [RESPONSE] ${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`
      );
    }

    return originalSend.call(this, data);
  };

  next();
});

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
const {
  seedProductionData,
  shouldSeed,
} = require("./scripts/productionSeeder");

// Connect to databases with enhanced logging
const initializeDatabases = async () => {
  console.log("💾 [DATABASE] Initializing database connections...");

  // Log sanitized MongoDB URI with more details
  const mongoUri = process.env.MONGODB_URI || "not set";
  const sanitizedMongoUri = mongoUri.replace(
    /\/\/([^:]+):([^@]+)@/,
    "//***:***@"
  );
  console.log("💾 [DATABASE] MongoDB URI:", sanitizedMongoUri);

  // Log MongoDB connection details for debugging
  if (mongoUri !== "not set") {
    try {
      const url = new URL(mongoUri);
      console.log("💾 [DATABASE] MongoDB Details:", {
        host: url.hostname,
        port: url.port,
        database: url.pathname.substring(1),
        authSource: url.searchParams.get("authSource") || "default",
      });
    } catch (e) {
      console.warn("⚠️ [DATABASE] Could not parse MongoDB URI:", e.message);
    }
  }

  try {
    await connectMongoDB();
    console.log("✅ [DATABASE] MongoDB connected successfully");
  } catch (error) {
    console.error("❌ [DATABASE] MongoDB connection failed:", {
      message: error.message,
      code: error.code,
      name: error.name,
    });
    throw error;
  }

  try {
    await connectRedis();
    console.log("✅ [DATABASE] Redis connected successfully");
  } catch (error) {
    console.warn("⚠️ [DATABASE] Redis connection failed:", {
      message: error.message,
      code: error.code,
    });
    // Don't throw - Redis is optional
  }

  // Create analytics indexes for performance
  try {
    await databaseIndexes.createAnalyticsIndexes();
    console.log("✅ [DATABASE] Analytics indexes created");
  } catch (error) {
    console.warn(
      "⚠️ [DATABASE] Failed to create analytics indexes:",
      error.message
    );
  }

  // Seed production data (event categories, etc.)
  try {
    const needsSeeding = await shouldSeed();
    if (needsSeeding) {
      const seedResult = await seedProductionData();
      if (seedResult.success) {
        console.log("✅ [DATABASE] Production data seeded successfully");
      } else {
        console.warn(
          "⚠️ [DATABASE] Production seeding failed:",
          seedResult.error
        );
      }
    }
  } catch (error) {
    console.warn("⚠️ [DATABASE] Production seeding error:", error.message);
  }
};

if (process.env.NODE_ENV !== "test") {
  initializeDatabases().catch((error) => {
    console.error("❌ [FATAL] Database initialization failed:", error);
    process.exit(1);
  });
}

// Enhanced health check endpoint
app.get("/api/health", async (req, res) => {
  const mongoose = require("mongoose");
  const startTime = Date.now();

  // Check MongoDB connection with detailed status
  const mongoStatus = mongoose.connection.readyState;
  const mongoStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  // Get MongoDB connection details
  const mongoDetails = {
    readyState: mongoStatus,
    status: mongoStatusMap[mongoStatus] || "unknown",
    host: mongoose.connection.host || "unknown",
    port: mongoose.connection.port || "unknown",
    name: mongoose.connection.name || "unknown",
    user: mongoose.connection.user || "unknown",
  };

  // Check Redis connection
  let redisStatus = "unknown";
  try {
    const redis = require("./config/redis");
    redisStatus = redis.isConnected() ? "connected" : "disconnected";
  } catch (error) {
    redisStatus = "error";
  }

  const responseTime = Date.now() - startTime;

  const health = {
    status: mongoStatus === 1 ? "ok" : "degraded",
    message: "Event-i API Health Check",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "unknown",
    node: process.version,
    services: {
      mongodb: mongoDetails,
      redis: {
        status: redisStatus,
      },
    },
    memory: {
      heapUsed:
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      heapTotal:
        Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
    },
    responseTime: responseTime + "ms",
  };

  // Return 503 if MongoDB is not connected
  const statusCode = mongoStatus === 1 ? 200 : 503;

  res.status(statusCode).json(health);
});

// Production seeding endpoint (for debugging)
if (process.env.NODE_ENV === "production") {
  app.post("/api/admin/seed", async (req, res) => {
    try {
      console.log("🌱 [ADMIN] Manual seeding triggered via API");
      const seedResult = await seedProductionData();

      if (seedResult.success) {
        res.json({
          success: true,
          message: "Production data seeded successfully",
          data: seedResult,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Seeding failed",
          error: seedResult.error,
        });
      }
    } catch (error) {
      console.error("❌ [ADMIN] Manual seeding error:", error);
      res.status(500).json({
        success: false,
        message: "Seeding error",
        error: error.message,
      });
    }
  });
}

// Authentication routes
app.use("/api/auth", authRoutes);

// Admin routes (protected)
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

const transactionFeeRoutes = require("./routes/transactionFees");
app.use("/api/admin/transaction-fees", transactionFeeRoutes);

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

// Global error handler (before 404 handler)
app.use((error, req, res, next) => {
  console.error("🚨 Global Error Handler:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    origin: req.get("origin"),
    userAgent: req.get("user-agent"),
    timestamp: new Date().toISOString(),
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({
      error: "Internal server error",
      message: "Something went wrong. Please try again later.",
    });
  } else {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });
  }
});

// 404 handler (after error handler)
app.use("*", (req, res) => {
  console.warn(`🚫 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// Start the server
if (process.env.NODE_ENV !== "test") {
  const runner = httpServer || app;
  runner.listen(PORT, async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 [SERVER] Event-i Server Started Successfully!");
    console.log("=".repeat(60));
    console.log(
      `📋 [INFO] Environment: ${process.env.NODE_ENV || "development"}`
    );
    console.log(`📋 [INFO] Port: ${PORT}`);
    console.log(`📋 [INFO] Node Version: ${process.version}`);
    console.log(`📋 [INFO] Process PID: ${process.pid}`);
    console.log(`📋 [INFO] Server Time: ${new Date().toISOString()}`);
    console.log(
      `📊 [ENDPOINT] Health Check: http://localhost:${PORT}/api/health`
    );

    if (httpServer) {
      console.log(
        `🔌 [ENDPOINT] WebSocket: http://localhost:${PORT}/socket.io/`
      );
    }

    console.log("=".repeat(60) + "\n");

    // Initialize Redis connection
    // Add error handler to prevent unhandled error crashes
    redisManager.on("error", (error) => {
      console.warn("⚠️ [REDIS] Redis error (handled):", error.message);
    });

    try {
      await redisManager.connect();
      console.log("✅ [REDIS] Redis connection initialized successfully");
    } catch (error) {
      console.warn(
        "⚠️ [REDIS] Redis initialization failed, continuing without Redis:",
        error.message
      );
    }

    console.log("\n✅ [SERVER] All systems ready - accepting requests\n");
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
