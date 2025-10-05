const Event = require('../../models/Event');
const Poll = require('../../models/Poll');

/**
 * Middleware to verify organizer access for polls
 * Ensures user is the organizer of the event or an admin
 */
async function verifyOrganizer(req, res, next) {
  try {
    const { eventId, pollId } = req.params;
    const userId = req.user._id;

    let event = null;

    // If we have a pollId, get the event from the poll
    if (pollId) {
      const poll = await Poll.findById(pollId).select('event organizer');
      if (!poll) {
        return res.status(404).json({
          error: 'POLL_NOT_FOUND',
          message: 'Poll not found'
        });
      }

      // Check if user is the organizer of this poll
      const isPollOrganizer = String(poll.organizer) === String(userId);
      const isAdmin = req.user.role === 'admin';

      if (!isPollOrganizer && !isAdmin) {
        return res.status(403).json({
          error: 'POLL_ORGANIZER_ACCESS_REQUIRED',
          message: 'Only poll organizers can perform this action'
        });
      }

      // Get the event for additional validation
      event = await Event.findById(poll.event).select('status');
      req.poll = poll;
    } else if (eventId) {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      event = await Event.findOne(eventQuery).select('organizer status');
      
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
    } else {
      return res.status(400).json({
        error: 'EVENT_ID_OR_POLL_ID_REQUIRED',
        message: 'Event ID or Poll ID is required'
      });
    }

    // Check if event is in a valid state for poll operations
    if (event && event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Cannot perform poll operations on cancelled events'
      });
    }

    // Attach event to request for use in controller
    req.event = event;
    next();

  } catch (error) {
    console.error('Organizer verification middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to verify organizer access for specific poll operations
 * More restrictive than general organizer verification
 */
async function verifyPollOrganizer(req, res, next) {
  try {
    const { pollId } = req.params;
    const userId = req.user._id;

    if (!pollId) {
      return res.status(400).json({
        error: 'POLL_ID_REQUIRED',
        message: 'Poll ID is required'
      });
    }

    // Get the poll
    const poll = await Poll.findById(pollId).select('event organizer status');
    if (!poll) {
      return res.status(404).json({
        error: 'POLL_NOT_FOUND',
        message: 'Poll not found'
      });
    }

    // Check if user is the organizer of this poll
    const isPollOrganizer = String(poll.organizer) === String(userId);
    const isAdmin = req.user.role === 'admin';

    if (!isPollOrganizer && !isAdmin) {
      return res.status(403).json({
        error: 'POLL_ORGANIZER_ACCESS_REQUIRED',
        message: 'Only poll organizers can perform this action'
      });
    }

    // Check if poll is in a valid state for operations
    if (poll.status === 'closed') {
      return res.status(403).json({
        error: 'POLL_CLOSED',
        message: 'Cannot modify closed polls'
      });
    }

    // Get the event for additional validation
    const event = await Event.findById(poll.event).select('status');
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Associated event not found'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Cannot perform poll operations on cancelled events'
      });
    }

    // Attach poll and event to request
    req.poll = poll;
    req.event = event;
    next();

  } catch (error) {
    console.error('Poll organizer verification middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to check if user can create polls for an event
 * Includes rate limiting and event status validation
 */
async function canCreatePoll(req, res, next) {
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
    const event = await Event.findOne(eventQuery).select('organizer status startDate endDate');
    
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
        message: 'Only event organizers can create polls'
      });
    }

    // Check if event is in a valid state for poll creation
    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Cannot create polls for cancelled events'
      });
    }

    if (event.status === 'completed') {
      return res.status(403).json({
        error: 'EVENT_COMPLETED',
        message: 'Cannot create polls for completed events'
      });
    }

    // Check if event has ended (optional - can be configured)
    const now = new Date();
    if (event.endDate && event.endDate < now) {
      return res.status(403).json({
        error: 'EVENT_ENDED',
        message: 'Cannot create polls for events that have ended'
      });
    }

    // Check active poll count for rate limiting
    const activePollCount = await Poll.countDocuments({
      event: event._id,
      status: 'active',
      deletedAt: null
    });

    const maxActivePolls = 5; // Configurable limit
    if (activePollCount >= maxActivePolls) {
      return res.status(429).json({
        error: 'POLL_LIMIT_EXCEEDED',
        message: `Maximum ${maxActivePolls} active polls allowed per event`,
        current_count: activePollCount,
        limit: maxActivePolls
      });
    }

    // Attach event to request
    req.event = event;
    next();

  } catch (error) {
    console.error('Can create poll middleware error:', error);
    res.status(500).json({
      error: 'MIDDLEWARE_ERROR',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  verifyOrganizer,
  verifyPollOrganizer,
  canCreatePoll
};





