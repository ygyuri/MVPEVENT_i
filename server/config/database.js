const mongoose = require('mongoose');
const Redis = require('redis');

// MongoDB connection with retry logic (useful for Docker compose startup ordering)
const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i';

  const maxAttempts = parseInt(process.env.MONGO_MAX_ATTEMPTS || '30', 10); // ~30 attempts
  const baseDelayMs = parseInt(process.env.MONGO_RETRY_DELAY_MS || '1000', 10); // 1s base delay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (error) {
      const isLast = attempt === maxAttempts;
      const delayMs = Math.min(baseDelayMs * attempt, 10000); // cap at 10s
      console.error(`❌ MongoDB connection failed (attempt ${attempt}/${maxAttempts}):`, error.message);
      if (isLast) {
        console.error('❌ Exhausted MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

// Redis connection (optional)
const connectRedis = async () => {
  // Skip Redis connection if REDIS_URL is not set
  if (!process.env.REDIS_URL) {
    console.log('⚠️ Redis disabled (REDIS_URL not set)');
    return null;
  }
  
  try {
    const client = Redis.createClient({
      url: process.env.REDIS_URL
    });
    client.on('error', (err) => {
      console.log('⚠️ Redis Client Error (non-critical):', err.message);
    });
    await client.connect();
    console.log('✅ Redis connected successfully');
    return client;
  } catch (error) {
    console.log('⚠️ Redis connection failed (non-critical, continuing without Redis):', error.message);
    return null;
  }
};

// Cache helper functions
const cache = {
  get: async (key) => null, // Temporarily disabled
  set: async (key, value, ttl = 3600) => null, // Temporarily disabled
  del: async (key) => null, // Temporarily disabled
  flush: async () => null // Temporarily disabled
};

module.exports = {
  connectMongoDB,
  connectRedis,
  cache
};
