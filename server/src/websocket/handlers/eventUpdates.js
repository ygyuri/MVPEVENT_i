const UpdateService = require('../../../services/updateService');
const { verifyEventAccess, verifyOrganizerAccess } = require('../middleware/auth');

/**
 * Event Updates WebSocket Handlers
 * Handles real-time event update operations
 */
function handleEventUpdates(socket, io) {
  
  /**
   * Handle creating new updates
   */
  socket.on('create:update', async (data) => {
    try {
      const { eventId, content, mediaUrls, priority } = data;
      
      // Validate input
      if (!eventId || !content) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Event ID and content are required' 
        });
        return;
      }

      // Verify organizer access
      const access = await verifyOrganizerAccess(socket, eventId);
      if (!access.hasAccess) {
        socket.emit('error', { 
          code: 'ACCESS_DENIED', 
          message: 'Only event organizers can create updates' 
        });
        return;
      }

      // Create update
      const update = await UpdateService.createUpdate(eventId, socket.user._id, {
        content,
        mediaUrls: mediaUrls || [],
        priority: priority || 'normal',
        moderation: { status: 'approved' }
      });

      // Broadcast to event room
      const room = `event:${eventId}`;
      io.to(room).emit('event:update', {
        type: 'new_update',
        data: {
          update_id: update._id,
          event_id: eventId,
          content: update.content,
          media_urls: update.mediaUrls,
          priority: update.priority,
          organizer_id: update.organizerId,
          timestamp: update.createdAt
        },
        timestamp: Date.now()
      });

      // Send confirmation to creator
      socket.emit('update:created', {
        update_id: update._id,
        status: 'success',
        delivered_to: io.sockets.adapter.rooms.get(room)?.size || 0
      });

      console.log(`📝 Update created by ${socket.user.email} for event ${eventId}`);

    } catch (error) {
      console.error('Create update error:', error);
      socket.emit('error', { 
        code: 'CREATE_UPDATE_FAILED', 
        message: 'Failed to create update' 
      });
    }
  });

  /**
   * Handle reacting to updates
   */
  socket.on('react:update', async (data) => {
    try {
      const { updateId, reactionType } = data;
      
      if (!updateId || !reactionType) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Update ID and reaction type are required' 
        });
        return;
      }

      // Get update to verify access
      const EventUpdate = require('../../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (!update) {
        socket.emit('error', { 
          code: 'UPDATE_NOT_FOUND', 
          message: 'Update not found' 
        });
        return;
      }

      // Verify event access
      const access = await verifyEventAccess(socket, update.eventId);
      if (!access.hasAccess) {
        socket.emit('error', { 
          code: 'ACCESS_DENIED', 
          message: 'Access denied to this event' 
        });
        return;
      }

      // Add reaction
      await UpdateService.react(updateId, socket.user._id, reactionType);

      // Broadcast reaction to event room
      const room = `event:${update.eventId}`;
      io.to(room).emit('event:reaction', {
        type: 'reaction_added',
        data: {
          update_id: updateId,
          user_id: socket.user._id,
          user_name: socket.user.firstName + ' ' + socket.user.lastName,
          reaction_type: reactionType,
          timestamp: Date.now()
        }
      });

      // Send confirmation
      socket.emit('reaction:added', {
        update_id: updateId,
        reaction_type: reactionType,
        status: 'success'
      });

      console.log(`👍 Reaction added by ${socket.user.email} to update ${updateId}`);

    } catch (error) {
      console.error('React to update error:', error);
      socket.emit('error', { 
        code: 'REACTION_FAILED', 
        message: 'Failed to add reaction' 
      });
    }
  });

  /**
   * Handle marking updates as read
   */
  socket.on('mark:read', async (data) => {
    try {
      const { updateId } = data;
      
      if (!updateId) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Update ID is required' 
        });
        return;
      }

      // Get update to verify access
      const EventUpdate = require('../../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (!update) {
        socket.emit('error', { 
          code: 'UPDATE_NOT_FOUND', 
          message: 'Update not found' 
        });
        return;
      }

      // Verify event access
      const access = await verifyEventAccess(socket, update.eventId);
      if (!access.hasAccess) {
        socket.emit('error', { 
          code: 'ACCESS_DENIED', 
          message: 'Access denied to this event' 
        });
        return;
      }

      // Mark as read
      await UpdateService.markRead(updateId, socket.user._id);

      // Send confirmation
      socket.emit('read:marked', {
        update_id: updateId,
        status: 'success',
        timestamp: Date.now()
      });

      console.log(`👁️ Update ${updateId} marked as read by ${socket.user.email}`);

    } catch (error) {
      console.error('Mark as read error:', error);
      socket.emit('error', { 
        code: 'MARK_READ_FAILED', 
        message: 'Failed to mark update as read' 
      });
    }
  });

  /**
   * Handle editing updates (within 5-minute window)
   */
  socket.on('edit:update', async (data) => {
    try {
      const { updateId, content, mediaUrls, priority } = data;
      
      if (!updateId || !content) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Update ID and content are required' 
        });
        return;
      }

      // Edit update
      const result = await UpdateService.edit(updateId, socket.user, {
        content,
        mediaUrls,
        priority
      });

      if (!result.ok) {
        socket.emit('error', { 
          code: result.msg, 
          message: result.msg 
        });
        return;
      }

      // Get update to broadcast
      const EventUpdate = require('../../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (update) {
        // Broadcast edit to event room
        const room = `event:${update.eventId}`;
        io.to(room).emit('event:update', {
          type: 'update_edited',
          data: {
            update_id: updateId,
            event_id: update.eventId,
            content: result.doc.content,
            media_urls: result.doc.mediaUrls,
            priority: result.doc.priority,
            edited_at: result.doc.editedAt,
            timestamp: Date.now()
          }
        });
      }

      // Send confirmation
      socket.emit('update:edited', {
        update_id: updateId,
        status: 'success',
        edit_window_remaining: result.editWindowRemaining
      });

      console.log(`✏️ Update ${updateId} edited by ${socket.user.email}`);

    } catch (error) {
      console.error('Edit update error:', error);
      socket.emit('error', { 
        code: 'EDIT_UPDATE_FAILED', 
        message: 'Failed to edit update' 
      });
    }
  });

  /**
   * Handle deleting updates
   */
  socket.on('delete:update', async (data) => {
    try {
      const { updateId } = data;
      
      if (!updateId) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Update ID is required' 
        });
        return;
      }

      // Delete update
      const result = await UpdateService.remove(updateId, socket.user);

      if (!result.ok) {
        socket.emit('error', { 
          code: result.msg, 
          message: result.msg 
        });
        return;
      }

      // Get update to broadcast
      const EventUpdate = require('../../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (update) {
        // Broadcast deletion to event room
        const room = `event:${update.eventId}`;
        io.to(room).emit('event:update', {
          type: 'update_deleted',
          data: {
            update_id: updateId,
            event_id: update.eventId,
            deleted_at: result.doc.deletedAt,
            timestamp: Date.now()
          }
        });
      }

      // Send confirmation
      socket.emit('update:deleted', {
        update_id: updateId,
        status: 'success'
      });

      console.log(`🗑️ Update ${updateId} deleted by ${socket.user.email}`);

    } catch (error) {
      console.error('Delete update error:', error);
      socket.emit('error', { 
        code: 'DELETE_UPDATE_FAILED', 
        message: 'Failed to delete update' 
      });
    }
  });

  /**
   * Handle requesting update history
   */
  socket.on('request:updates', async (data) => {
    try {
      const { eventId, limit = 50, before } = data;
      
      if (!eventId) {
        socket.emit('error', { 
          code: 'INVALID_INPUT', 
          message: 'Event ID is required' 
        });
        return;
      }

      // Verify event access
      const access = await verifyEventAccess(socket, eventId);
      if (!access.hasAccess) {
        socket.emit('error', { 
          code: 'ACCESS_DENIED', 
          message: 'Access denied to this event' 
        });
        return;
      }

      // Get updates
      const updates = await UpdateService.listUpdates(eventId, { 
        limit, 
        before, 
        onlyApproved: true 
      });

      // Send updates
      socket.emit('updates:history', {
        event_id: eventId,
        updates,
        count: updates.length,
        timestamp: Date.now()
      });

      console.log(`📜 Sent ${updates.length} updates to ${socket.user.email}`);

    } catch (error) {
      console.error('Request updates error:', error);
      socket.emit('error', { 
        code: 'REQUEST_UPDATES_FAILED', 
        message: 'Failed to fetch updates' 
      });
    }
  });
}

module.exports = { handleEventUpdates };
