/**
 * Socket.io Configuration
 * Centralized configuration for WebSocket server
 */
module.exports = {
  // CORS configuration
  cors: {
    origins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000'
    ],
    credentials: true
  },

  // Transport methods
  transports: ['websocket', 'polling'],

  // Connection settings
  pingTimeout: 60000,        // 60 seconds
  pingInterval: 25000,       // 25 seconds
  maxHttpBufferSize: 1e6,    // 1MB

  // Redis configuration for scaling
  redis: {
    enabled: process.env.REDIS_URL ? true : false,
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    options: {
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableReadyCheck: false
    }
  },

  // Room settings
  rooms: {
    maxUsersPerRoom: 10000,
    cleanupInterval: 300000,  // 5 minutes
    presenceTimeout: 300000   // 5 minutes
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMs: 60000,         // 1 minute
    maxRequests: 100,        // 100 requests per minute
    skipSuccessfulRequests: false
  },

  // Event-specific settings
  events: {
    maxUpdatesPerHour: 10,
    maxReactionsPerMinute: 30,
    editWindowMinutes: 5,
    maxContentLength: 1000
  },

  // Logging
  logging: {
    enabled: process.env.NODE_ENV === 'development',
    level: process.env.LOG_LEVEL || 'info'
  },

  // Security
  security: {
    requireAuth: true,
    validateOrigin: true,
    maxConnectionsPerUser: 5
  }
};
