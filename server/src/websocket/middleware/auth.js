const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Session = require('../../models/Session');
const { JWT_SECRET } = require('../../middleware/auth');

/**
 * Socket.io Authentication Middleware
 * Verifies JWT tokens for WebSocket connections
 */
async function verifySocketAuth(socket, next) {
  try {
    // Extract token from handshake
    const token = extractToken(socket);
    
    if (!token) {
      return next(new Error('NO_TOKEN'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validate user and session
    const [user, session] = await Promise.all([
      User.findOne({ _id: decoded.userId, isActive: true }).select('-passwordHash'),
      Session.findOne({ 
        sessionToken: token, 
        expiresAt: { $gt: new Date() }, 
        isActive: true 
      })
    ]);

    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }

    if (!session) {
      return next(new Error('INVALID_SESSION'));
    }

    // Attach user and session to socket
    socket.user = user;
    socket.session = session;
    
    console.log(`🔐 Socket authenticated for user: ${user.email}`);
    return next();
    
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('INVALID_TOKEN'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('TOKEN_EXPIRED'));
    }
    
    return next(new Error('AUTHENTICATION_FAILED'));
  }
}

/**
 * Extract JWT token from socket handshake
 */
function extractToken(socket) {
  // Try different token sources
  const sources = [
    socket.handshake.auth?.token,
    socket.handshake.headers?.authorization?.split(' ')[1],
    socket.handshake.query?.token,
    socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0]
  ];

  for (const token of sources) {
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }

  return null;
}

/**
 * Socket.io error handler
 */
function handleSocketError(socket, error) {
  console.error(`Socket error for ${socket.id}:`, error.message);
  
  const errorMap = {
    'NO_TOKEN': { code: 'NO_TOKEN', message: 'Authentication token required' },
    'INVALID_TOKEN': { code: 'INVALID_TOKEN', message: 'Invalid authentication token' },
    'TOKEN_EXPIRED': { code: 'TOKEN_EXPIRED', message: 'Authentication token expired' },
    'USER_NOT_FOUND': { code: 'USER_NOT_FOUND', message: 'User not found' },
    'INVALID_SESSION': { code: 'INVALID_SESSION', message: 'Invalid session' },
    'AUTHENTICATION_FAILED': { code: 'AUTHENTICATION_FAILED', message: 'Authentication failed' }
  };

  const errorInfo = errorMap[error.message] || { 
    code: 'UNKNOWN_ERROR', 
    message: 'An unknown error occurred' 
  };

  socket.emit('auth:error', errorInfo);
  socket.disconnect(true);
}

/**
 * Middleware to check if user has access to event
 */
async function verifyEventAccess(socket, eventId) {
  try {
    if (!socket.user) {
      throw new Error('USER_NOT_AUTHENTICATED');
    }

    // Check if user is organizer
    const Event = require('../../models/Event');
    const event = await Event.findOne({ 
      $or: [{ _id: eventId }, { slug: eventId }] 
    }).select('organizer');

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const isOrganizer = String(event.organizer) === String(socket.user._id);
    const isAdmin = socket.user.role === 'admin';

    if (isOrganizer || isAdmin) {
      return { hasAccess: true, role: 'organizer' };
    }

    // Check if user has ticket
    const Ticket = require('../../models/Ticket');
    const hasTicket = await Ticket.exists({ 
      eventId: event._id, 
      ownerUserId: socket.user._id 
    });

    if (hasTicket) {
      return { hasAccess: true, role: 'attendee' };
    }

    throw new Error('ACCESS_DENIED');
    
  } catch (error) {
    console.error('Event access verification error:', error.message);
    throw error;
  }
}

/**
 * Middleware to check if user can create updates
 */
async function verifyOrganizerAccess(socket, eventId) {
  try {
    if (!socket.user) {
      throw new Error('USER_NOT_AUTHENTICATED');
    }

    const Event = require('../../models/Event');
    const event = await Event.findOne({ 
      $or: [{ _id: eventId }, { slug: eventId }] 
    }).select('organizer');

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const isOrganizer = String(event.organizer) === String(socket.user._id);
    const isAdmin = socket.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      throw new Error('ORGANIZER_ACCESS_REQUIRED');
    }

    return { hasAccess: true, role: isAdmin ? 'admin' : 'organizer' };
    
  } catch (error) {
    console.error('Organizer access verification error:', error.message);
    throw error;
  }
}

module.exports = {
  verifySocketAuth,
  handleSocketError,
  verifyEventAccess,
  verifyOrganizerAccess
};
