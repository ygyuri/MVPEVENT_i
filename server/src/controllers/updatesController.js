const UpdateService = require('../../services/updateService');
const AnalyticsService = require('../../services/analyticsService');
const { broadcastUpdate } = require('../../realtime/socketInstance');

/**
 * Updates Controller
 * Handles business logic for event updates
 */
class UpdatesController {
  
  /**
   * Create a new update
   */
  async createUpdate(req) {
    const { eventId } = req.params;
    const { content, media_urls, priority } = req.body;
    const userId = req.user._id;

    try {
      // Validate organizer access
      const accessCheck = await UpdateService.validateOrganizer(eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Create update
      const update = await UpdateService.createUpdate(eventId, userId, {
        content,
        mediaUrls: media_urls || [],
        priority: priority || 'normal',
        moderation: { status: 'approved' }
      });

      // Broadcast to WebSocket clients
      try {
        broadcastUpdate(eventId, {
          update_id: update._id,
          event_id: eventId,
          content: update.content,
          media_urls: update.mediaUrls,
          priority: update.priority,
          organizer_id: update.organizerId,
          timestamp: update.createdAt
        });
      } catch (socketError) {
        console.warn('Failed to broadcast update:', socketError.message);
      }

      // Get online user count for response
      const onlineCount = await this.getOnlineUserCount(eventId);

      return {
        success: true,
        data: {
          update_id: update._id,
          event_id: eventId,
          content: update.content,
          media_urls: update.mediaUrls,
          priority: update.priority,
          timestamp: update.createdAt,
          delivered_to: onlineCount
        }
      };

    } catch (error) {
      console.error('Create update error:', error);
      throw error;
    }
  }

  /**
   * Get updates for an event
   */
  async getUpdates(req) {
    const { eventId } = req.params;
    const { limit = 50, before, priority } = req.query;

    try {
      // Validate reader access
      const accessCheck = await UpdateService.validateReader(eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Get updates
      const updates = await UpdateService.listUpdates(eventId, { 
        limit: parseInt(limit), 
        before, 
        onlyApproved: true 
      });

      // Filter by priority if specified
      let filteredUpdates = updates;
      if (priority) {
        filteredUpdates = updates.filter(update => update.priority === priority);
      }

      // Get reaction counts and user reactions
      const enrichedUpdates = await this.enrichUpdatesWithReactions(filteredUpdates, req.user._id);

      return {
        success: true,
        data: {
          updates: enrichedUpdates,
          pagination: {
            page: 1,
            total: enrichedUpdates.length,
            has_more: updates.length === parseInt(limit)
          }
        }
      };

    } catch (error) {
      console.error('Get updates error:', error);
      throw error;
    }
  }

  /**
   * Add reaction to an update
   */
  async addReaction(req) {
    const { updateId } = req.params;
    const { reaction } = req.body;
    const userId = req.user._id;

    try {
      // Get update to verify access
      const EventUpdate = require('../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (!update) {
        return {
          error: 'UPDATE_NOT_FOUND',
          code: 404
        };
      }

      // Validate reader access
      const accessCheck = await UpdateService.validateReader(update.eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Add reaction
      await UpdateService.react(updateId, userId, reaction);

      // Get updated reaction count
      const reactionCount = await this.getReactionCount(updateId, reaction);

      return {
        success: true,
        data: {
          update_id: updateId,
          reaction_type: reaction,
          new_count: reactionCount
        }
      };

    } catch (error) {
      console.error('Add reaction error:', error);
      throw error;
    }
  }

  /**
   * Edit an update
   */
  async editUpdate(req) {
    const { updateId } = req.params;
    const { content, media_urls, priority } = req.body;

    try {
      // Edit update
      const result = await UpdateService.edit(updateId, req.user, {
        content,
        mediaUrls: media_urls,
        priority
      });

      if (!result.ok) {
        return {
          error: result.msg,
          code: result.code
        };
      }

      // Calculate remaining edit window
      const editWindowRemaining = this.calculateEditWindowRemaining(result.doc.createdAt);

      return {
        success: true,
        data: {
          update_id: updateId,
          updated: true,
          edit_window_remaining: editWindowRemaining
        }
      };

    } catch (error) {
      console.error('Edit update error:', error);
      throw error;
    }
  }

  /**
   * Delete an update
   */
  async deleteUpdate(req) {
    const { updateId } = req.params;

    try {
      // Delete update
      const result = await UpdateService.remove(updateId, req.user);

      if (!result.ok) {
        return {
          error: result.msg,
          code: result.code
        };
      }

      return {
        success: true,
        data: {
          update_id: updateId,
          deleted: true
        }
      };

    } catch (error) {
      console.error('Delete update error:', error);
      throw error;
    }
  }

  /**
   * Get specific update details
   */
  async getUpdate(req) {
    const { updateId } = req.params;

    try {
      const EventUpdate = require('../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId);
      
      if (!update) {
        return {
          error: 'UPDATE_NOT_FOUND',
          code: 404
        };
      }

      // Validate reader access
      const accessCheck = await UpdateService.validateReader(update.eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Enrich with reactions
      const enrichedUpdate = await this.enrichUpdatesWithReactions([update], req.user._id);

      return {
        success: true,
        data: enrichedUpdate[0]
      };

    } catch (error) {
      console.error('Get update error:', error);
      throw error;
    }
  }

  /**
   * Mark update as read
   */
  async markAsRead(req) {
    const { updateId } = req.params;
    const userId = req.user._id;

    try {
      // Get update to verify access
      const EventUpdate = require('../../models/EventUpdate');
      const update = await EventUpdate.findById(updateId).select('eventId');
      
      if (!update) {
        return {
          error: 'UPDATE_NOT_FOUND',
          code: 404
        };
      }

      // Validate reader access
      const accessCheck = await UpdateService.validateReader(update.eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Mark as read
      await UpdateService.markRead(updateId, userId);

      return {
        success: true,
        data: {
          update_id: updateId,
          read_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Get update analytics
   */
  async getAnalytics(req) {
    const { eventId } = req.params;

    try {
      // Validate organizer access
      const accessCheck = await UpdateService.validateOrganizer(eventId, req.user);
      if (!accessCheck.ok) {
        return {
          error: accessCheck.msg,
          code: accessCheck.code
        };
      }

      // Get analytics
      const analytics = await AnalyticsService.getUpdateAnalytics(eventId);

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  }

  /**
   * Enrich updates with reaction data
   */
  async enrichUpdatesWithReactions(updates, userId) {
    const EventUpdateReaction = require('../../models/EventUpdateReaction');
    const EventUpdateRead = require('../../models/EventUpdateRead');

    const enrichedUpdates = await Promise.all(updates.map(async (update) => {
      // Get reaction counts
      const reactions = await EventUpdateReaction.aggregate([
        { $match: { updateId: update._id } },
        { $group: { _id: '$reactionType', count: { $sum: 1 } } }
      ]);

      const reactionCounts = {};
      reactions.forEach(reaction => {
        reactionCounts[reaction._id] = reaction.count;
      });

      // Get user's reaction
      const userReaction = await EventUpdateReaction.findOne({
        updateId: update._id,
        userId: userId
      });

      // Check if user has read this update
      const isRead = await EventUpdateRead.exists({
        updateId: update._id,
        userId: userId
      });

      return {
        update_id: update._id,
        event_id: update.eventId,
        content: update.content,
        media_urls: update.mediaUrls,
        priority: update.priority,
        timestamp: update.createdAt,
        reactions: reactionCounts,
        user_reacted: userReaction?.reactionType || null,
        is_read: !!isRead
      };
    }));

    return enrichedUpdates;
  }

  /**
   * Get reaction count for specific type
   */
  async getReactionCount(updateId, reactionType) {
    const EventUpdateReaction = require('../../models/EventUpdateReaction');
    return await EventUpdateReaction.countDocuments({
      updateId: updateId,
      reactionType: reactionType
    });
  }

  /**
   * Calculate remaining edit window in seconds
   */
  calculateEditWindowRemaining(createdAt) {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const editWindowMs = 5 * 60 * 1000; // 5 minutes
    const remaining = Math.max(0, editWindowMs - (now - created));
    return Math.floor(remaining / 1000);
  }

  /**
   * Get online user count for event
   */
  async getOnlineUserCount(eventId) {
    try {
      // This would typically come from a presence service
      // For now, return a mock count
      return 42;
    } catch (error) {
      console.error('Get online user count error:', error);
      return 0;
    }
  }
}

module.exports = new UpdatesController();
