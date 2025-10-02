const presence = require('../../realtime/presence');

/**
 * Room Management for WebSocket Connections
 * Handles event-specific room operations and presence tracking
 */
function manageRooms(socket, io) {
  
  /**
   * Handle joining event rooms with presence tracking
   */
  socket.on('join:event', async (data) => {
    try {
      const { eventId } = data;
      
      if (!eventId) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Event ID is required' 
        });
        return;
      }

      // Join the event room
      await socket.join(`event:${eventId}`);
      
      // Mark user as online for this event
      if (socket.user?._id) {
        await presence.markOnline(eventId, socket.user._id);
      }

      // Get current online count
      const onlineCount = await presence.getOnlineUserCount(eventId);
      
      // Notify user of successful join
      socket.emit('joined:event', { 
        eventId, 
        status: 'success',
        onlineCount,
        timestamp: Date.now()
      });

      // Broadcast user online status to room
      socket.to(`event:${eventId}`).emit('user:online', {
        user_id: socket.user?._id,
        user_name: socket.user ? `${socket.user.firstName} ${socket.user.lastName}` : 'Anonymous',
        onlineCount,
        timestamp: Date.now()
      });

      console.log(`🎪 User ${socket.user?.email} joined event room: ${eventId} (${onlineCount} online)`);

    } catch (error) {
      console.error('Join event room error:', error);
      socket.emit('error', { 
        code: 'JOIN_ROOM_FAILED', 
        message: 'Failed to join event room' 
      });
    }
  });

  /**
   * Handle leaving event rooms with presence tracking
   */
  socket.on('leave:event', async (data) => {
    try {
      const { eventId } = data;
      
      if (!eventId) return;

      // Leave the event room
      await socket.leave(`event:${eventId}`);
      
      // Mark user as offline for this event
      if (socket.user?._id) {
        await presence.markOffline(eventId, socket.user._id);
      }

      // Get updated online count
      const onlineCount = await presence.getOnlineUserCount(eventId);
      
      // Notify user of successful leave
      socket.emit('left:event', { 
        eventId, 
        status: 'success',
        timestamp: Date.now()
      });

      // Broadcast user offline status to room
      socket.to(`event:${eventId}`).emit('user:offline', {
        user_id: socket.user?._id,
        user_name: socket.user ? `${socket.user.firstName} ${socket.user.lastName}` : 'Anonymous',
        onlineCount,
        timestamp: Date.now()
      });

      console.log(`🚪 User ${socket.user?.email} left event room: ${eventId} (${onlineCount} online)`);

    } catch (error) {
      console.error('Leave event room error:', error);
    }
  });

  /**
   * Handle presence heartbeat
   */
  socket.on('presence:heartbeat', async (data) => {
    try {
      const { eventId } = data;
      
      if (!eventId || !socket.user?._id) return;

      // Update last seen timestamp
      await presence.updateLastSeen(eventId, socket.user._id);
      
      // Get current online count
      const onlineCount = await presence.getOnlineUserCount(eventId);
      
      // Send updated count
      socket.emit('presence:updated', {
        eventId,
        onlineCount,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Presence heartbeat error:', error);
    }
  });

  /**
   * Handle requesting online users list
   */
  socket.on('request:online_users', async (data) => {
    try {
      const { eventId } = data;
      
      if (!eventId) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Event ID is required' 
        });
        return;
      }

      // Get online users
      const onlineUsers = await presence.getOnlineUsers(eventId);
      const onlineCount = onlineUsers.length;
      
      // Send online users list
      socket.emit('online_users:list', {
        eventId,
        users: onlineUsers,
        count: onlineCount,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Request online users error:', error);
      socket.emit('error', { 
        code: 'REQUEST_ONLINE_USERS_FAILED', 
        message: 'Failed to fetch online users' 
      });
    }
  });

  /**
   * Handle room cleanup on disconnect
   */
  socket.on('disconnect', async () => {
    try {
      if (!socket.user?._id) return;

      // Get all rooms this socket was in
      const rooms = Array.from(socket.rooms);
      
      for (const room of rooms) {
        if (room.startsWith('event:')) {
          const eventId = room.replace('event:', '');
          
          // Mark user as offline
          await presence.markOffline(eventId, socket.user._id);
          
          // Get updated online count
          const onlineCount = await presence.getOnlineUserCount(eventId);
          
          // Broadcast user offline status
          socket.to(room).emit('user:offline', {
            user_id: socket.user._id,
            user_name: `${socket.user.firstName} ${socket.user.lastName}`,
            onlineCount,
            timestamp: Date.now()
          });
        }
      }

      console.log(`🧹 Cleaned up rooms for disconnected user: ${socket.user.email}`);

    } catch (error) {
      console.error('Room cleanup error:', error);
    }
  });
}

/**
 * Utility functions for room management
 */
class RoomManager {
  constructor(io) {
    this.io = io;
  }

  /**
   * Get online user count for an event
   */
  async getOnlineUserCount(eventId) {
    const room = `event:${eventId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);
    return sockets ? sockets.size : 0;
  }

  /**
   * Get list of online users for an event
   */
  async getOnlineUsers(eventId) {
    const room = `event:${eventId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);
    
    if (!sockets) return [];

    const users = [];
    for (const socketId of sockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket?.user) {
        users.push({
          user_id: socket.user._id,
          user_name: `${socket.user.firstName} ${socket.user.lastName}`,
          email: socket.user.email,
          joined_at: socket.handshake.time
        });
      }
    }

    return users;
  }

  /**
   * Broadcast message to event room
   */
  broadcastToEvent(eventId, event, data) {
    const room = `event:${eventId}`;
    this.io.to(room).emit(event, data);
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, event, data) {
    const room = `user:${userId}`;
    this.io.to(room).emit(event, data);
  }

  /**
   * Check if user is online in event
   */
  async isUserOnlineInEvent(eventId, userId) {
    const room = `event:${eventId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);
    
    if (!sockets) return false;

    for (const socketId of sockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket?.user?._id === userId) {
        return true;
      }
    }

    return false;
  }
}

module.exports = { manageRooms, RoomManager };
