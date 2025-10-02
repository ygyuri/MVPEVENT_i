const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const http = require('http');
const { verifySocketAuth } = require('./middleware/auth');
const { handleEventUpdates } = require('./handlers/eventUpdates');
const { manageRooms } = require('./rooms');
const config = require('../config/socket');

/**
 * WebSocket Server Setup
 * Handles real-time communication for event updates
 */
class WebSocketServer {
  constructor(app) {
    this.app = app;
    this.server = http.createServer(app);
    this.io = null;
    this.redis = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the WebSocket server
   */
  async initialize() {
    try {
      console.log('🔌 Initializing WebSocket server...');

      // Create Socket.io server
      this.io = new Server(this.server, {
        cors: {
          origin: config.cors.origins,
          credentials: config.cors.credentials
        },
        transports: config.transports,
        pingTimeout: config.pingTimeout,
        pingInterval: config.pingInterval,
        maxHttpBufferSize: config.maxHttpBufferSize
      });

      // Setup Redis adapter for scaling
      await this.setupRedisAdapter();

      // Apply authentication middleware
      this.io.use(verifySocketAuth);

      // Setup event handlers
      this.setupEventHandlers();

      // Setup room management
      this.setupRoomManagement();

      this.isInitialized = true;
      console.log('✅ WebSocket server initialized successfully');

      return { server: this.server, io: this.io };
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Setup Redis adapter for multi-server scaling
   */
  async setupRedisAdapter() {
    try {
      if (config.redis.enabled) {
        const redisUrl = config.redis.url;
        const pubClient = new Redis(redisUrl, { 
          maxRetriesPerRequest: null,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null
        });
        const subClient = pubClient.duplicate();

        this.io.adapter(createAdapter(pubClient, subClient));
        this.redis = pubClient;
        console.log('✅ Redis adapter configured for scaling');
      } else {
        console.log('⚠️ Redis adapter disabled - single server mode');
      }
    } catch (error) {
      console.warn('⚠️ Redis adapter setup failed, continuing without scaling:', error.message);
    }
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id} (User: ${socket.user?.email || 'anonymous'})`);

      // Handle event-specific updates
      handleEventUpdates(socket, this.io);

      // Handle room management
      manageRooms(socket, this.io);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} (Reason: ${reason})`);
        this.handleDisconnection(socket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle reconnection flush
      socket.on('reconnect:flush', async (data) => {
        await this.handleReconnectionFlush(socket, data);
      });
    });
  }

  /**
   * Setup room management
   */
  setupRoomManagement() {
    // Global room management events
    this.io.on('connection', (socket) => {
      // Join personal room for direct messages
      if (socket.user?._id) {
        socket.join(`user:${socket.user._id}`);
        console.log(`👤 User ${socket.user.email} joined personal room`);
      }

      // Handle event room joins
      socket.on('join:event', async (data) => {
        const { eventId } = data;
        if (!eventId) {
          socket.emit('error', { message: 'Event ID required' });
          return;
        }

        try {
          await socket.join(`event:${eventId}`);
          socket.emit('joined:event', { 
            eventId, 
            status: 'success',
            timestamp: Date.now()
          });
          console.log(`🎪 User ${socket.user?.email} joined event room: ${eventId}`);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join event room' });
          console.error('Failed to join event room:', error);
        }
      });

      // Handle event room leaves
      socket.on('leave:event', async (data) => {
        const { eventId } = data;
        if (!eventId) return;

        try {
          await socket.leave(`event:${eventId}`);
          socket.emit('left:event', { 
            eventId, 
            status: 'success',
            timestamp: Date.now()
          });
          console.log(`🚪 User ${socket.user?.email} left event room: ${eventId}`);
        } catch (error) {
          console.error('Failed to leave event room:', error);
        }
      });
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(socket) {
    // Clean up any event-specific data
    if (socket.user?._id) {
      // Remove from presence tracking
      this.io.emit('user:offline', { 
        userId: socket.user._id,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle reconnection flush for missed updates
   */
  async handleReconnectionFlush(socket, data) {
    const { eventId } = data;
    if (!eventId || !socket.user?._id) return;

    try {
      // Get last seen timestamp for this user/event
      const lastSeen = await this.getLastSeen(eventId, socket.user._id);
      if (!lastSeen) return;

      // Fetch missed updates
      const UpdateService = require('../../services/updateService');
      const updates = await UpdateService.listUpdatesSince(eventId, lastSeen, { onlyApproved: true });
      
      if (updates?.length > 0) {
        socket.emit('event:backlog', { 
          eventId, 
          updates,
          count: updates.length,
          timestamp: Date.now()
        });
        console.log(`📦 Sent ${updates.length} missed updates to ${socket.user.email}`);
      }

      // Update last seen timestamp
      await this.updateLastSeen(eventId, socket.user._id);
    } catch (error) {
      console.error('Failed to handle reconnection flush:', error);
    }
  }

  /**
   * Get last seen timestamp for user/event
   */
  async getLastSeen(eventId, userId) {
    // This would typically come from a presence service
    // For now, return a timestamp from 1 hour ago
    return new Date(Date.now() - 60 * 60 * 1000);
  }

  /**
   * Update last seen timestamp for user/event
   */
  async updateLastSeen(eventId, userId) {
    // This would typically update a presence service
    // For now, just log
    console.log(`👁️ Updated last seen for user ${userId} in event ${eventId}`);
  }

  /**
   * Broadcast update to event room
   */
  broadcastUpdate(eventId, updateData) {
    if (!this.io) {
      console.error('WebSocket server not initialized');
      return;
    }

    const room = `event:${eventId}`;
    this.io.to(room).emit('event:update', {
      type: 'new_update',
      data: updateData,
      timestamp: Date.now()
    });

    console.log(`📢 Broadcasted update to room ${room}`);
  }

  /**
   * Get online user count for event
   */
  getOnlineUserCount(eventId) {
    if (!this.io) return 0;
    
    const room = `event:${eventId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);
    return sockets ? sockets.size : 0;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down WebSocket server...');
    
    if (this.io) {
      this.io.close();
    }
    
    if (this.redis) {
      this.redis.disconnect();
    }
    
    console.log('✅ WebSocket server shutdown complete');
  }
}

module.exports = WebSocketServer;
