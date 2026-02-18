const EventEmitter = require('events');

class RedisConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.isConnected = false;
    this.isAvailable = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000;
  }

  async connect() {
    try {
      // Try to load Redis dependencies
      const IORedis = require('ioredis');
      const BullMQ = require('bullmq');
      
      if (!IORedis || !BullMQ) {
        console.warn('⚠️ Redis dependencies not available, running in fallback mode');
        return this.setFallbackMode();
      }

      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      
      // Create Redis connection with timeout
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        connectTimeout: 5000,
        lazyConnect: true
      });

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('🔗 Redis connected successfully');
        this.isConnected = true;
        this.isAvailable = true;
        this.retryCount = 0;
        this.emit('connected');
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis ready for operations');
        this.isConnected = true;
        this.isAvailable = true;
        this.emit('ready');
      });

      this.redis.on('error', (error) => {
        console.warn('⚠️ Redis connection error:', error.message);
        this.isConnected = false;
        this.emit('error', error);
        
        // Retry connection
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`🔄 Retrying Redis connection (${this.retryCount}/${this.maxRetries})...`);
          setTimeout(() => this.connect(), this.retryDelay * this.retryCount);
        } else {
          console.warn('❌ Redis connection failed after maximum retries, running in fallback mode');
          this.setFallbackMode();
        }
      });

      this.redis.on('close', () => {
        console.warn('🔌 Redis connection closed');
        this.isConnected = false;
        this.emit('close');
      });

      // Attempt to connect
      await this.redis.connect();
      
      return this.redis;

    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis:', error.message);
      return this.setFallbackMode();
    }
  }

  setFallbackMode() {
    console.log('🔄 Running in Redis fallback mode - queues disabled, using in-memory alternatives');
    this.isAvailable = false;
    this.isConnected = false;
    
    // Create mock Redis instance
    this.redis = {
      connected: false,
      status: 'end',
      on: () => {},
      off: () => {},
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      del: () => Promise.resolve(0),
      exists: () => Promise.resolve(0),
      expire: () => Promise.resolve(0),
      keys: () => Promise.resolve([]),
      duplicate: () => this.redis
    };

    this.emit('fallback');
    return this.redis;
  }

  getRedis() {
    return this.redis;
  }

  isRedisAvailable() {
    return this.isAvailable && this.isConnected;
  }

  async disconnect() {
    if (this.redis && this.isConnected) {
      try {
        await this.redis.disconnect();
        console.log('🔌 Redis disconnected');
      } catch (error) {
        console.warn('⚠️ Error disconnecting Redis:', error.message);
      }
    }
  }

  // Queue factory with fallback
  createQueue(name, options = {}) {
    if (!this.isRedisAvailable()) {
      // console.log(`📦 Creating fallback queue for: ${name}`);
      return this.createFallbackQueue(name);
    }

    try {
      const { Queue } = require('bullmq');
      return new Queue(name, {
        connection: this.redis,
        ...options
      });
    } catch (error) {
      console.warn(`⚠️ Failed to create queue ${name}, using fallback:`, error.message);
      return this.createFallbackQueue(name);
    }
  }

  createFallbackQueue(name) {
    // Simple in-memory queue fallback
    return {
      name,
      add: (jobName, data, options = {}) => {
        console.log(`📝 [FALLBACK QUEUE] ${name}:${jobName}`, data);
        return Promise.resolve({ id: Date.now().toString() });
      },
      getJobCounts: () => Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 }),
      close: () => Promise.resolve(),
      clean: () => Promise.resolve(),
      pause: () => Promise.resolve(),
      resume: () => Promise.resolve()
    };
  }

  // Worker factory with fallback
  createWorker(name, processor, options = {}) {
    if (!this.isRedisAvailable()) {
      // console.log(`👷 Creating fallback worker for: ${name}`);
      return this.createFallbackWorker(name, processor);
    }

    try {
      const { Worker } = require('bullmq');
      return new Worker(name, processor, {
        connection: this.redis,
        ...options
      });
    } catch (error) {
      console.warn(`⚠️ Failed to create worker ${name}, using fallback:`, error.message);
      return this.createFallbackWorker(name, processor);
    }
  }

  createFallbackWorker(name, processor) {
    // console.log(`👷 [FALLBACK WORKER] ${name} initialized (no background processing)`);
    return {
      name,
      close: () => Promise.resolve(),
      pause: () => Promise.resolve(),
      resume: () => Promise.resolve(),
      on: () => {},
      off: () => {}
    };
  }

  // QueueEvents factory with fallback
  createQueueEvents(name, options = {}) {
    if (!this.isRedisAvailable()) {
      // console.log(`📊 Creating fallback queue events for: ${name}`);
      return this.createFallbackQueueEvents(name);
    }

    try {
      const { QueueEvents } = require('bullmq');
      return new QueueEvents(name, {
        connection: this.redis,
        ...options
      });
    } catch (error) {
      console.warn(`⚠️ Failed to create queue events ${name}, using fallback:`, error.message);
      return this.createFallbackQueueEvents(name);
    }
  }

  createFallbackQueueEvents(name) {
    return {
      name,
      on: () => {},
      off: () => {},
      close: () => Promise.resolve()
    };
  }
}

// Singleton instance
const redisManager = new RedisConnectionManager();

module.exports = redisManager;
