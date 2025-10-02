const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { JWT_SECRET } = require('../middleware/auth');

async function verifySocketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('NO_TOKEN'));

    const decoded = jwt.verify(token, JWT_SECRET);
    const [user, session] = await Promise.all([
      User.findOne({ _id: decoded.userId, isActive: true }).select('-passwordHash'),
      Session.findOne({ sessionToken: token, expiresAt: { $gt: new Date() }, isActive: true })
    ]);

    if (!user || !session) return next(new Error('INVALID_SESSION'));

    socket.user = user;
    socket.session = session;
    return next();
  } catch (e) {
    return next(new Error('INVALID_TOKEN'));
  }
}

module.exports = { verifySocketAuth };


