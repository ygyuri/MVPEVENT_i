const mongoose = require('mongoose');
const Redis = require('redis');

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Redis connection
const connectRedis = async () => {
  try {
    const client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    console.log('✅ Redis connected successfully');
    return client;
  } catch (error) {
    console.log('⚠️ Redis connection failed (non-critical):', error.message);
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
