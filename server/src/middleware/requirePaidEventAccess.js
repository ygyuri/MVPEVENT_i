const Ticket = require('../../models/Ticket');
const Event = require('../../models/Event');

const isSkipPaymentEnabled = () => {
  const flag = String(process.env.SKIP_PAYMENT || '').toLowerCase();
  const enabled = flag === '1' || flag === 'true' || flag === 'yes';
  return enabled && process.env.NODE_ENV !== 'production';
};

async function requirePaidEventAccess(req, res, next) {
  try {
    const { eventId } = req.params;
    const bodyEventId = req.body?.eventId;
    const effectiveEventId = eventId || bodyEventId;

    if (!effectiveEventId) {
      return res.status(400).json({
        error: 'EVENT_ID_REQUIRED',
        message: 'Event ID is required'
      });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const isObjectId = mongoIdRegex.test(effectiveEventId);

    const eventQuery = isObjectId
      ? { $or: [{ _id: effectiveEventId }, { slug: effectiveEventId }] }
      : { slug: effectiveEventId };

    const event = await Event.findOne(eventQuery).select('_id status organizer');
    if (!event) {
      return res.status(404).json({
        error: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(403).json({
        error: 'EVENT_CANCELLED',
        message: 'Event has been cancelled'
      });
    }

    const isAdmin = req.user?.role === 'admin';
    const isOrganizerOwner = String(event.organizer) === String(userId);

    if (isAdmin || isOrganizerOwner) {
      req.event = event;
      req.hasPaidAccess = true;
      return next();
    }

    if (isSkipPaymentEnabled()) {
      req.event = event;
      req.hasPaidAccess = true;
      return next();
    }

    const ticket = await Ticket.findOne({
      eventId: event._id,
      ownerUserId: userId,
      status: { $in: ['active', 'used'] }
    }).populate('orderId');

    if (!ticket) {
      return res.status(403).json({
        error: 'TICKET_REQUIRED',
        message: 'Valid paid ticket required'
      });
    }

    const orderStatus = ticket.orderId?.status;
    const paymentStatus = ticket.orderId?.paymentStatus;

    const isPaid =
      orderStatus === 'paid' ||
      orderStatus === 'completed' ||
      paymentStatus === 'paid' ||
      paymentStatus === 'completed';

    if (!isPaid) {
      return res.status(403).json({
        error: 'ORDER_NOT_PAID',
        message: 'Valid paid ticket required'
      });
    }

    req.ticket = ticket;
    req.event = event;
    req.hasPaidAccess = true;
    return next();
  } catch (error) {
    console.error('requirePaidEventAccess error:', error);
    return res.status(500).json({
      error: 'ACCESS_CHECK_FAILED',
      message: 'Failed to verify event access'
    });
  }
}

module.exports = { requirePaidEventAccess };
