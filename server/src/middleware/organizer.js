const Event = require('../../models/Event');

/**
 * Middleware to verify organizer access
 * Ensures user is the organizer of the event or an admin
 */
async function requireOrganizer(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    if (!eventId) {
      return res.status(400).json({
        error: 'EVENT_ID_REQUIRED',
        message: 'Event ID is required'
      });
    }

    // Handle both ObjectId and slug
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const isObjectId = mongoIdRegex.test(eventId);
    
    const eventQuery = isObjectId 
      ? { $or: [{ _id: eventId }, { slug: eventId }] }
      : { slug: eventId };

    // Find the event
    const event = await Event.findOne(eventQuery).select('organizer status');
    
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    const isOrganizer = String(event.organizer) === String(userId);
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        error: 'ORGANIZER_ACCESS_REQUIRED',
        message: 'Only event organizers can perform this action'
      });
    }

    // Check if event is active
    if (event.status !== 'published' && event.status !== 'active') {
      return res.status(403).json({
        error: 'EVENT_NOT_ACTIVE',
        message: 'Event is not active'
      });
    }

    // Attach event to request for use in controller
    req.event = event;
    next();

  } catch (error) {
    console.error('Organizer middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to verify organizer access for specific update
 * Ensures user is the organizer of the event that contains the update
 */
async function requireUpdateOrganizer(req, res, next) {
  try {
    const { updateId } = req.params;
    const userId = req.user._id;

    if (!updateId) {
      return res.status(400).json({
        error: 'UPDATE_ID_REQUIRED',
        message: 'Update ID is required'
      });
    }

    // Get the update to find the event
    const EventUpdate = require('../../models/EventUpdate');
    const update = await EventUpdate.findById(updateId).select('eventId organizerId');
    
    if (!update) {
      return res.status(404).json({
        error: 'UPDATE_NOT_FOUND',
        message: 'Update not found'
      });
    }

    // Check if user is the organizer of this update
    const isUpdateOrganizer = String(update.organizerId) === String(userId);
    const isAdmin = req.user.role === 'admin';

    if (!isUpdateOrganizer && !isAdmin) {
      return res.status(403).json({
        error: 'UPDATE_ORGANIZER_ACCESS_REQUIRED',
        message: 'Only the update creator can perform this action'
      });
    }

    // Attach update to request for use in controller
    req.update = update;
    next();

  } catch (error) {
    console.error('Update organizer middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to check rate limiting for organizer posts
 * Prevents spam by limiting updates per hour
 */
async function checkOrganizerRateLimit(req, res, next) {
  try {
    const userId = req.user._id;
    const { eventId } = req.params;

    // Check if user has exceeded rate limit
    const EventUpdate = require('../../models/EventUpdate');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentUpdates = await EventUpdate.countDocuments({
      organizerId: userId,
      eventId: eventId,
      createdAt: { $gte: oneHourAgo }
    });

    const maxUpdatesPerHour = 10; // Configurable
    if (recentUpdates >= maxUpdatesPerHour) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Maximum ${maxUpdatesPerHour} updates per hour allowed`,
        retry_after: 3600 // 1 hour in seconds
      });
    }

    next();

  } catch (error) {
    console.error('Rate limit middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to validate event status
 * Ensures event is in a state that allows updates
 */
async function validateEventStatus(req, res, next) {
  try {
    const { eventId } = req.params;

    // Handle both ObjectId and slug
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const isObjectId = mongoIdRegex.test(eventId);
    
    const eventQuery = isObjectId 
      ? { $or: [{ _id: eventId }, { slug: eventId }] }
      : { slug: eventId };

    const event = await Event.findOne(eventQuery).select('status startDate endDate');
    
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    // Check if event is in a valid state for updates
    const validStatuses = ['published', 'active'];
    if (!validStatuses.includes(event.status)) {
      return res.status(403).json({
        error: 'EVENT_NOT_ACTIVE',
        message: 'Event is not in a state that allows updates'
      });
    }

    // Check if event has started (optional - can be configured)
    const now = new Date();
    if (event.startDate && event.startDate > now) {
      // Allow updates before event starts (configurable)
      console.log('Event has not started yet, but allowing updates');
    }

    // Check if event has ended (optional - can be configured)
    if (event.endDate && event.endDate < now) {
      // Allow updates after event ends (configurable)
      console.log('Event has ended, but allowing updates');
    }

    req.event = event;
    next();

  } catch (error) {
    console.error('Event status middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  requireOrganizer,
  requireUpdateOrganizer,
  checkOrganizerRateLimit,
  validateEventStatus
};
