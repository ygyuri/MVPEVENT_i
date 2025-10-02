const http = require('http');
let Server, createAdapter, Redis;
try {
  ({ Server } = require('socket.io'));
  ({ createAdapter } = require('@socket.io/redis-adapter'));
  Redis = require('ioredis');
} catch (e) {
  // Lightweight stubs for tests without socket deps
  Server = class { constructor() {} on() {} use() {} to() { return { emit() {} }; } of() { return this; } adapter = {}; }; 
  createAdapter = () => ({});
  Redis = class {};
}

const { verifySocketAuth } = require('./socketAuth');

function initializeSocket(app) {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Redis adapter for multi-node scaling
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (e) {
    // Non-fatal in local/dev or tests
  }

  // Auth middleware
  io.use(verifySocketAuth);

  const presence = require('./presence');
  io.on('connection', (socket) => {
    const { user } = socket;
    // Join personal room for direct pushes
    if (user?._id) socket.join(`user:${user._id}`);

    // Client should emit join with eventId to subscribe
    socket.on('join:event', async ({ eventId }) => {
      if (!eventId) return;
      socket.join(`event:${eventId}`);
      try { await presence.markOnline(eventId, user?._id); } catch (e) {}
      socket.emit('joined:event', { eventId });
    });

    socket.on('leave:event', async ({ eventId }) => {
      if (!eventId) return;
      socket.leave(`event:${eventId}`);
      try { await presence.markOffline(eventId, user?._id); } catch (e) {}
    });

    // Heartbeat + reconnect backlog flush
    socket.on('ping', () => socket.emit('pong'));

    socket.on('reconnect:flush', async ({ eventId }) => {
      if (!eventId || !user?._id) return;
      try {
        const lastSeen = await presence.getLastSeen(eventId, user._id);
        if (!lastSeen) return;
        const UpdateService = require('../services/updateService');
        const updates = await UpdateService.listUpdatesSince(eventId, lastSeen, { onlyApproved: true });
        if (updates?.length) socket.emit('event:backlog', { eventId, updates });
        await presence.markOnline(eventId, user._id);
      } catch (e) {}
    });

    socket.on('disconnect', (reason) => {
      // no-op; room memberships auto-cleaned
    });
  });

  const broadcastUpdate = (eventId, payload) => {
    io.to(`event:${eventId}`).emit('event:update', payload);
  };

  return { server, io, broadcastUpdate };
}

module.exports = { initializeSocket };


