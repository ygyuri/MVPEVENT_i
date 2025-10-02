const Event = require('../../models/Event');
const EventUpdate = require('../../models/EventUpdate');
const EventStaff = require('../../models/EventStaff');

/**
 * Organizer Check Middleware
 * Verifies user has organizer permissions for events
 */
class OrganizerCheck {
  
  /**
   * Check if user is event organizer
   */
  static async isEventOrganizer(eventId, userId) {
    try {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      const event = await Event.findOne(eventQuery).select('organizer status');
      
      if (!event) {
        return { isOrganizer: false, reason: 'EVENT_NOT_FOUND' };
      }

      // Check if user is the organizer
      const isOrganizer = String(event.organizer) === String(userId);
      
      return { 
        isOrganizer, 
        event,
        reason: isOrganizer ? 'ORGANIZER' : 'NOT_ORGANIZER'
      };

    } catch (error) {
      console.error('Is event organizer check error:', error);
      return { isOrganizer: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check if user is event staff
   */
  static async isEventStaff(eventId, userId) {
    try {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      const event = await Event.findOne(eventQuery).select('_id');
      
      if (!event) {
        return { isStaff: false, reason: 'EVENT_NOT_FOUND' };
      }

      // Check if user is event staff
      const staff = await EventStaff.findOne({
        eventId: event._id,
        userId: userId,
        isActive: true
      });

      const isStaff = !!staff;
      
      return { 
        isStaff, 
        staff,
        event,
        reason: isStaff ? 'STAFF' : 'NOT_STAFF'
      };

    } catch (error) {
      console.error('Is event staff check error:', error);
      return { isStaff: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check if user has organizer or staff access
   */
  static async hasOrganizerAccess(eventId, userId) {
    try {
      // Check if user is organizer
      const organizerCheck = await this.isEventOrganizer(eventId, userId);
      if (organizerCheck.isOrganizer) {
        return { 
          hasAccess: true, 
          role: 'organizer',
          event: organizerCheck.event,
          reason: 'ORGANIZER'
        };
      }

      // Check if user is staff
      const staffCheck = await this.isEventStaff(eventId, userId);
      if (staffCheck.isStaff) {
        return { 
          hasAccess: true, 
          role: 'staff',
          event: staffCheck.event,
          staff: staffCheck.staff,
          reason: 'STAFF'
        };
      }

      return { 
        hasAccess: false, 
        reason: 'NO_ACCESS',
        event: organizerCheck.event || staffCheck.event
      };

    } catch (error) {
      console.error('Has organizer access check error:', error);
      return { hasAccess: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check if user can create updates for event
   */
  static async canCreateUpdates(eventId, userId) {
    try {
      // Check organizer access
      const accessCheck = await this.hasOrganizerAccess(eventId, userId);
      if (!accessCheck.hasAccess) {
        return { 
          canCreate: false, 
          reason: accessCheck.reason,
          event: accessCheck.event
        };
      }

      // Check if event is in a valid state
      if (accessCheck.event && accessCheck.event.status !== 'published' && accessCheck.event.status !== 'active') {
        return { 
          canCreate: false, 
          reason: 'EVENT_NOT_ACTIVE',
          event: accessCheck.event
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkUpdateRateLimit(eventId, userId);
      if (!rateLimitCheck.allowed) {
        return { 
          canCreate: false, 
          reason: 'RATE_LIMIT_EXCEEDED',
          event: accessCheck.event,
          rateLimit: rateLimitCheck
        };
      }

      return { 
        canCreate: true, 
        role: accessCheck.role,
        event: accessCheck.event,
        rateLimit: rateLimitCheck
      };

    } catch (error) {
      console.error('Can create updates check error:', error);
      return { canCreate: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check if user can edit specific update
   */
  static async canEditUpdate(updateId, userId) {
    try {
      // Get the update
      const update = await EventUpdate.findById(updateId).select('eventId organizerId createdAt');
      
      if (!update) {
        return { canEdit: false, reason: 'UPDATE_NOT_FOUND' };
      }

      // Check if user is the organizer of this update
      const isUpdateOrganizer = String(update.organizerId) === String(userId);
      
      if (!isUpdateOrganizer) {
        return { canEdit: false, reason: 'NOT_UPDATE_ORGANIZER' };
      }

      // Check edit window (5 minutes)
      const now = Date.now();
      const editWindowMs = 5 * 60 * 1000; // 5 minutes
      const timeSinceCreation = now - new Date(update.createdAt).getTime();
      
      if (timeSinceCreation > editWindowMs) {
        return { 
          canEdit: false, 
          reason: 'EDIT_WINDOW_EXPIRED',
          editWindowRemaining: 0
        };
      }

      return { 
        canEdit: true, 
        update,
        editWindowRemaining: Math.floor((editWindowMs - timeSinceCreation) / 1000)
      };

    } catch (error) {
      console.error('Can edit update check error:', error);
      return { canEdit: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check if user can delete specific update
   */
  static async canDeleteUpdate(updateId, userId) {
    try {
      // Get the update
      const update = await EventUpdate.findById(updateId).select('eventId organizerId');
      
      if (!update) {
        return { canDelete: false, reason: 'UPDATE_NOT_FOUND' };
      }

      // Check if user is the organizer of this update
      const isUpdateOrganizer = String(update.organizerId) === String(userId);
      
      if (!isUpdateOrganizer) {
        return { canDelete: false, reason: 'NOT_UPDATE_ORGANIZER' };
      }

      return { canDelete: true, update };

    } catch (error) {
      console.error('Can delete update check error:', error);
      return { canDelete: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Check update rate limiting
   */
  static async checkUpdateRateLimit(eventId, userId) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const maxUpdatesPerHour = 10;

      // Count recent updates
      const recentUpdates = await EventUpdate.countDocuments({
        organizerId: userId,
        eventId: eventId,
        createdAt: { $gte: oneHourAgo }
      });

      const allowed = recentUpdates < maxUpdatesPerHour;
      const remaining = Math.max(0, maxUpdatesPerHour - recentUpdates);
      const resetTime = new Date(Date.now() + 60 * 60 * 1000);

      return {
        allowed,
        current: recentUpdates,
        limit: maxUpdatesPerHour,
        remaining,
        resetTime
      };

    } catch (error) {
      console.error('Update rate limit check error:', error);
      return {
        allowed: false,
        current: 0,
        limit: 10,
        remaining: 0,
        resetTime: new Date()
      };
    }
  }

  /**
   * Get user's organizer events
   */
  static async getUserOrganizerEvents(userId) {
    try {
      const events = await Event.find({
        organizer: userId,
        status: { $in: ['published', 'active'] }
      }).select('title slug status startDate endDate');

      return events;

    } catch (error) {
      console.error('Get user organizer events error:', error);
      return [];
    }
  }

  /**
   * Get user's staff events
   */
  static async getUserStaffEvents(userId) {
    try {
      const staffAssignments = await EventStaff.find({
        userId: userId,
        isActive: true
      }).populate('eventId', 'title slug status startDate endDate');

      const events = staffAssignments
        .map(assignment => assignment.eventId)
        .filter(event => event && ['published', 'active'].includes(event.status));

      return events;

    } catch (error) {
      console.error('Get user staff events error:', error);
      return [];
    }
  }

  /**
   * Get user's all accessible events (organizer + staff)
   */
  static async getUserAccessibleEvents(userId) {
    try {
      const [organizerEvents, staffEvents] = await Promise.all([
        this.getUserOrganizerEvents(userId),
        this.getUserStaffEvents(userId)
      ]);

      // Combine and deduplicate
      const allEvents = [...organizerEvents, ...staffEvents];
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => String(e._id) === String(event._id))
      );

      return uniqueEvents;

    } catch (error) {
      console.error('Get user accessible events error:', error);
      return [];
    }
  }
}

module.exports = OrganizerCheck;
