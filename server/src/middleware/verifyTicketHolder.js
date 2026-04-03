const Ticket = require('../../models/Ticket');
const Event = require('../../models/Event');
const Poll = require('../../models/Poll');

/**
 * Middleware to verify ticket holder access for polls
 * Ensures users have valid tickets to access poll functionality
 */
async function verifyTicketHolder(req, res, next) {
  try {
    const { eventId, pollId } = req.params;
    const userId = req.user._id;

    let event = null;

    // If we have a pollId, get the event from the poll
    if (pollId) {
      const poll = await Poll.findById(pollId).select('event');
      if (!poll) {
        return res.status(404).json({
          error: 'POLL_NOT_FOUND',
          message: 'Poll not found'
        });
      }

      // Get the event
      event = await Event.findById(poll.event).select('_id status');
      if (!event) {
        return res.status(404).json({
          error: 'EVENT_NOT_FOUND',
          message: 'Associated event not found'
        });
      }

      req.poll = poll;
    } else if (eventId) {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      event = await Event.findOne(eventQuery).select('_id status');
      
      if (!event) {
        return res.status(404).json({
          error: 'EVENT_NOT_FOUND',
          message: 'Event not found'
        });
      }
    } else {
      return res.status(400).json({
        error: 'EVENT_ID_OR_POLL_ID_REQUIRED',
        message: 'Event ID or Poll ID is required'
      });
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Event has been cancelled'
      });
    }

    const { ticket, deny } = await findPollEligibleTicket(
      event._id,
      userId,
      req.user?.email
    );
    if (!ticket) {
      return res.status(403).json({
        error: deny.error || 'TICKET_REQUIRED',
        message: deny.message || 'Valid ticket required to access poll functionality'
      });
    }

    req.ticket = ticket;
    req.event = event;
    next();

  } catch (error) {
    console.error('Ticket holder verification middleware error:', error);
    res.status(500).json({
      error: 'TICKET_VERIFICATION_FAILED',
      message: 'Failed to verify ticket access'
    });
  }
}

/**
 * Middleware to verify ticket holder access for voting
 * More restrictive than general ticket holder verification
 */
async function verifyVotingAccess(req, res, next) {
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
    const poll = await Poll.findById(pollId).select('event status closesAt allowAnonymous');
    if (!poll) {
      return res.status(404).json({
        error: 'POLL_NOT_FOUND',
        message: 'Poll not found'
      });
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return res.status(403).json({
        error: 'POLL_NOT_ACTIVE',
        message: 'Poll is not active'
      });
    }

    // Check if poll has expired
    if (poll.closesAt && new Date() > poll.closesAt) {
      return res.status(403).json({
        error: 'POLL_EXPIRED',
        message: 'Poll has expired'
      });
    }

    // Get the event
    const event = await Event.findById(poll.event).select('_id status');
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Associated event not found'
      });
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Event has been cancelled'
      });
    }

    const { ticket, deny } = await findPollEligibleTicket(
      event._id,
      userId,
      req.user?.email
    );
    if (!ticket) {
      return res.status(403).json({
        error: deny.error || 'TICKET_REQUIRED',
        message: deny.message || 'Valid ticket required to vote on polls'
      });
    }

    // Attach poll, ticket and event to request
    req.poll = poll;
    req.ticket = ticket;
    req.event = event;
    next();

  } catch (error) {
    console.error('Voting access verification middleware error:', error);
    res.status(500).json({
      error: 'VOTING_ACCESS_VERIFICATION_FAILED',
      message: 'Failed to verify voting access'
    });
  }
}

/**
 * Middleware to verify ticket holder access for viewing results
 * Less restrictive than voting access
 */
async function verifyResultsAccess(req, res, next) {
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
    const poll = await Poll.findById(pollId).select('event status showResultsBeforeVote');
    if (!poll) {
      return res.status(404).json({
        error: 'POLL_NOT_FOUND',
        message: 'Poll not found'
      });
    }

    // Get the event
    const event = await Event.findById(poll.event).select('_id status');
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Associated event not found'
      });
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Event has been cancelled'
      });
    }

    const { ticket, deny } = await findPollEligibleTicket(
      event._id,
      userId,
      req.user?.email
    );
    if (!ticket) {
      return res.status(403).json({
        error: deny.error || 'TICKET_REQUIRED',
        message: deny.message || 'Valid ticket required to view poll results'
      });
    }

    // Attach poll, ticket and event to request
    req.poll = poll;
    req.ticket = ticket;
    req.event = event;
    next();

  } catch (error) {
    console.error('Results access verification middleware error:', error);
    res.status(500).json({
      error: 'RESULTS_ACCESS_VERIFICATION_FAILED',
      message: 'Failed to verify results access'
    });
  }
}

/**
 * Poll results: event or poll organizer / admin may view tallies without a ticket or vote.
 * Otherwise same ticket check as verifyResultsAccess.
 */
async function verifyPollResultsAccess(req, res, next) {
  try {
    const { pollId } = req.params;
    const userId = req.user._id;

    if (!pollId) {
      return res.status(400).json({
        error: 'POLL_ID_REQUIRED',
        message: 'Poll ID is required'
      });
    }

    const poll = await Poll.findById(pollId).select('event organizer');
    if (!poll) {
      return res.status(404).json({
        error: 'POLL_NOT_FOUND',
        message: 'Poll not found'
      });
    }

    const event = await Event.findById(poll.event).select('_id status organizer');
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Associated event not found'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Event has been cancelled'
      });
    }

    const isPollOrganizer = String(poll.organizer) === String(userId);
    const isEventOrganizer = event.organizer && String(event.organizer) === String(userId);
    const isAdmin = req.user.role === 'admin';

    if (isPollOrganizer || isEventOrganizer || isAdmin) {
      req.poll = poll;
      req.event = event;
      req.viewPollResultsAsOrganizer = true;
      return next();
    }

    const { ticket, deny } = await findPollEligibleTicket(
      event._id,
      userId,
      req.user?.email
    );
    if (!ticket) {
      return res.status(403).json({
        error: deny.error || 'TICKET_REQUIRED',
        message: deny.message || 'Valid ticket required to view poll results'
      });
    }

    req.poll = poll;
    req.ticket = ticket;
    req.event = event;
    req.viewPollResultsAsOrganizer = false;
    next();
  } catch (error) {
    console.error('Poll results access verification error:', error);
    res.status(500).json({
      error: 'RESULTS_ACCESS_VERIFICATION_FAILED',
      message: 'Failed to verify results access'
    });
  }
}

/**
 * Validate ticket status and conditions
 */
async function validateTicket(ticket) {
  try {
    // Check if ticket is active
    if (ticket.status !== 'active') {
      return {
        isValid: false,
        error: 'TICKET_INACTIVE',
        message: 'Ticket is not active'
      };
    }

    // Check if ticket is refunded
    if (ticket.status === 'refunded') {
      return {
        isValid: false,
        error: 'TICKET_REFUNDED',
        message: 'Ticket has been refunded'
      };
    }

    // Check if ticket is cancelled
    if (ticket.status === 'cancelled') {
      return {
        isValid: false,
        error: 'TICKET_CANCELLED',
        message: 'Ticket has been cancelled'
      };
    }

    // Check if ticket is expired
    if (ticket.expiresAt && new Date() > ticket.expiresAt) {
      return {
        isValid: false,
        error: 'TICKET_EXPIRED',
        message: 'Ticket has expired'
      };
    }

    // Check if order is paid (align with wallet / PayHero: status or paymentStatus)
    if (ticket.orderId) {
      const o = ticket.orderId;
      const orderPaid =
        o.status === 'paid' ||
        o.status === 'completed' ||
        o.paymentStatus === 'paid' ||
        o.paymentStatus === 'completed';
      if (!orderPaid) {
        return {
          isValid: false,
          error: 'ORDER_NOT_PAID',
          message: 'Order is not paid'
        };
      }
    }

    // Check if order is cancelled
    if (ticket.orderId && ticket.orderId.status === 'cancelled') {
      return {
        isValid: false,
        error: 'ORDER_CANCELLED',
        message: 'Order has been cancelled'
      };
    }

    // Check if order is refunded
    if (ticket.orderId && ticket.orderId.status === 'refunded') {
      return {
        isValid: false,
        error: 'ORDER_REFUNDED',
        message: 'Order has been refunded'
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Ticket validation error:', error);
    return {
      isValid: false,
      error: 'TICKET_VALIDATION_FAILED',
      message: 'Failed to validate ticket'
    };
  }
}

/**
 * Paid active ticket for this event: by ownerUserId first, then holder email (legacy / mismatched owner rows).
 */
async function findPollEligibleTicket(eventMongoId, userId, userEmail) {
  let ticket = await Ticket.findOne({
    eventId: eventMongoId,
    ownerUserId: userId
  }).populate('orderId');

  if (ticket) {
    const v = await validateTicket(ticket);
    if (v.isValid) return { ticket };
    return { deny: v };
  }

  if (userEmail) {
    const email = String(userEmail).toLowerCase().trim();
    ticket = await Ticket.findOne({
      eventId: eventMongoId,
      'holder.email': email,
      status: 'active'
    }).populate('orderId');
    if (ticket) {
      const v = await validateTicket(ticket);
      if (v.isValid) return { ticket };
      return { deny: v };
    }
  }

  return {
    deny: {
      error: 'TICKET_REQUIRED',
      message: 'Valid ticket required to access poll functionality'
    }
  };
}

/**
 * Middleware to check if user can access poll functionality
 * Non-blocking version that sets flags on request
 * Allows both ticket holders and organizers
 */
async function checkPollAccess(req, res, next) {
  try {
    const { eventId, pollId } = req.params;
    const userId = req.user._id;

    let event = null;

    // If we have a pollId, get the event from the poll
    if (pollId) {
      const poll = await Poll.findById(pollId).select('event');
      if (poll) {
        event = await Event.findById(poll.event).select('_id status organizer');
        req.poll = poll;
      }
    } else if (eventId) {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      event = await Event.findOne(eventQuery).select('_id status organizer');
    }

    if (event) {
      // Check if user is the organizer (organizers have full access)
      if (event.organizer && event.organizer.toString() === userId.toString()) {
        req.hasPollAccess = true;
        req.isOrganizer = true;
        req.event = event;
        return next();
      }

      const { ticket } = await findPollEligibleTicket(
        event._id,
        userId,
        req.user?.email
      );
      if (ticket) {
        req.hasPollAccess = true;
        req.ticket = ticket;
        req.event = event;
        req.isOrganizer = false;
      } else {
        req.hasPollAccess = false;
      }
    } else {
      req.hasPollAccess = false;
    }

    next();

  } catch (error) {
    console.error('Check poll access error:', error);
    req.hasPollAccess = false;
    next();
  }
}

module.exports = {
  verifyTicketHolder,
  verifyVotingAccess,
  verifyResultsAccess,
  verifyPollResultsAccess,
  checkPollAccess,
  validateTicket
};





