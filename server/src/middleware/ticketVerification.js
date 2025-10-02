const Ticket = require('../../models/Ticket');
const Event = require('../../models/Event');
const Order = require('../../models/Order');

/**
 * Ticket Verification Middleware
 * Ensures users have valid tickets to access event updates
 */
class TicketVerification {
  
  /**
   * Verify user has valid ticket for event
   */
  static async verifyTicketAccess(req, res, next) {
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
      const event = await Event.findOne(eventQuery).select('_id status');
      
      if (!event) {
        return res.status(404).json({
          error: 'EVENT_NOT_FOUND',
          message: 'Event not found'
        });
      }

      // Check if event is cancelled
      if (event.status === 'cancelled') {
        return res.status(403).json({
          error: 'EVENT_CANCELLED',
          message: 'Event has been cancelled'
        });
      }

      // Check if user has valid ticket
      const ticket = await Ticket.findOne({
        eventId: event._id,
        ownerUserId: userId
      }).populate('orderId');

      if (!ticket) {
        return res.status(403).json({
          error: 'TICKET_REQUIRED',
          message: 'Valid ticket required to access event updates'
        });
      }

      // Verify ticket status
      const ticketValidation = await this.validateTicket(ticket);
      if (!ticketValidation.isValid) {
        return res.status(403).json({
          error: ticketValidation.error,
          message: ticketValidation.message
        });
      }

      // Attach ticket and event to request
      req.ticket = ticket;
      req.event = event;
      next();

    } catch (error) {
      console.error('Ticket verification error:', error);
      res.status(500).json({
        error: 'TICKET_VERIFICATION_FAILED',
        message: 'Failed to verify ticket access'
      });
    }
  }

  /**
   * Validate ticket status and conditions
   */
  static async validateTicket(ticket) {
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

      // Check if order is paid
      if (ticket.orderId && ticket.orderId.status !== 'paid') {
        return {
          isValid: false,
          error: 'ORDER_NOT_PAID',
          message: 'Order is not paid'
        };
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
   * Verify user has ticket for multiple events
   */
  static async verifyMultipleEventAccess(req, res, next) {
    try {
      const { eventIds } = req.body;
      const userId = req.user._id;

      if (!eventIds || !Array.isArray(eventIds)) {
        return res.status(400).json({
          error: 'EVENT_IDS_REQUIRED',
          message: 'Event IDs array is required'
        });
      }

      // Get all tickets for the user and events
      const tickets = await Ticket.find({
        eventId: { $in: eventIds },
        ownerUserId: userId
      }).populate('orderId');

      // Validate each ticket
      const validTickets = [];
      const invalidTickets = [];

      for (const ticket of tickets) {
        const validation = await this.validateTicket(ticket);
        if (validation.isValid) {
          validTickets.push(ticket);
        } else {
          invalidTickets.push({
            eventId: ticket.eventId,
            error: validation.error,
            message: validation.message
          });
        }
      }

      // Check if user has access to at least one event
      if (validTickets.length === 0) {
        return res.status(403).json({
          error: 'NO_VALID_TICKETS',
          message: 'No valid tickets found for any of the requested events',
          details: invalidTickets
        });
      }

      // Attach valid tickets to request
      req.validTickets = validTickets;
      req.invalidTickets = invalidTickets;
      next();

    } catch (error) {
      console.error('Multiple event access verification error:', error);
      res.status(500).json({
        error: 'MULTIPLE_EVENT_VERIFICATION_FAILED',
        message: 'Failed to verify access to multiple events'
      });
    }
  }

  /**
   * Verify user has ticket for event (non-blocking)
   */
  static async verifyTicketAccessOptional(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;

      if (!eventId) {
        return next();
      }

      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      const event = await Event.findOne(eventQuery).select('_id status');
      
      if (!event) {
        return next();
      }

      // Check if user has valid ticket
      const ticket = await Ticket.findOne({
        eventId: event._id,
        ownerUserId: userId
      }).populate('orderId');

      if (ticket) {
        // Validate ticket
        const ticketValidation = await this.validateTicket(ticket);
        if (ticketValidation.isValid) {
          req.ticket = ticket;
          req.event = event;
          req.hasTicketAccess = true;
        } else {
          req.hasTicketAccess = false;
          req.ticketError = ticketValidation;
        }
      } else {
        req.hasTicketAccess = false;
      }

      next();

    } catch (error) {
      console.error('Optional ticket verification error:', error);
      req.hasTicketAccess = false;
      next();
    }
  }

  /**
   * Check if user can access event updates
   */
  static async canAccessEventUpdates(eventId, userId) {
    try {
      // Handle both ObjectId and slug
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const isObjectId = mongoIdRegex.test(eventId);
      
      const eventQuery = isObjectId 
        ? { $or: [{ _id: eventId }, { slug: eventId }] }
        : { slug: eventId };

      // Find the event
      const event = await Event.findOne(eventQuery).select('_id status');
      
      if (!event) {
        return { canAccess: false, reason: 'EVENT_NOT_FOUND' };
      }

      // Check if event is cancelled
      if (event.status === 'cancelled') {
        return { canAccess: false, reason: 'EVENT_CANCELLED' };
      }

      // Check if user has valid ticket
      const ticket = await Ticket.findOne({
        eventId: event._id,
        ownerUserId: userId
      }).populate('orderId');

      if (!ticket) {
        return { canAccess: false, reason: 'TICKET_REQUIRED' };
      }

      // Validate ticket
      const ticketValidation = await this.validateTicket(ticket);
      if (!ticketValidation.isValid) {
        return { canAccess: false, reason: ticketValidation.error };
      }

      return { canAccess: true, ticket, event };

    } catch (error) {
      console.error('Can access event updates error:', error);
      return { canAccess: false, reason: 'VERIFICATION_FAILED' };
    }
  }

  /**
   * Get user's tickets for an event
   */
  static async getUserTicketsForEvent(eventId, userId) {
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
        return { tickets: [], event: null };
      }

      // Get user's tickets for this event
      const tickets = await Ticket.find({
        eventId: event._id,
        ownerUserId: userId
      }).populate('orderId');

      return { tickets, event };

    } catch (error) {
      console.error('Get user tickets error:', error);
      return { tickets: [], event: null };
    }
  }
}

module.exports = TicketVerification;
