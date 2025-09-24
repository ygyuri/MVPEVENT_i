const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const EventStaff = require('../models/EventStaff');
const ScanLog = require('../models/ScanLog');
const ticketService = require('../services/ticketService');
// Rate limiting
const qrIssueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
const scanLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const router = express.Router();

// Helper: standard validation handler
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
}

// GET /api/tickets/my - list user's tickets
router.get('/my', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await ticketService.getUserTickets(req.user._id, { page: parseInt(page), limit: parseInt(limit) });
    const simplified = data.tickets.map(t => ({
      id: t._id,
      event: t.eventId ? { id: t.eventId._id, title: t.eventId.title, startDate: t.eventId.dates?.startDate } : null,
      holder: { firstName: t.holder.firstName, lastName: t.holder.lastName },
      ticketType: t.ticketType,
      status: t.status,
      usedAt: t.usedAt,
      qrAvailable: !!t.qr
    }));
    res.json({ success: true, data: { tickets: simplified, pagination: data.pagination } });
  } catch (error) {
    console.error('❌ Get my tickets failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:ticketId - get a specific ticket (owner or organizer/admin)
router.get('/:ticketId', verifyToken, [param('ticketId').isMongoId()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate('eventId', 'title dates organizer');
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const isOwner = String(ticket.ownerUserId) === String(req.user._id);
    const isOrganizer = ticket.eventId && String(ticket.eventId.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }

    const payload = {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      event: ticket.eventId ? { id: ticket.eventId._id, title: ticket.eventId.title, startDate: ticket.eventId.dates?.startDate } : null,
      holder: ticket.holder,
      ticketType: ticket.ticketType,
      status: ticket.status,
      usedAt: ticket.usedAt,
      usedBy: ticket.usedBy,
      metadata: ticket.metadata,
      qrAvailable: !!ticket.qr,
    };
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('❌ Get ticket failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets/:ticketId/qr - issue or rotate QR (owner only)
router.post('/:ticketId/qr', qrIssueLimiter, verifyToken, [param('ticketId').isMongoId(), body('rotate').optional().isBoolean()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const ticket = await Ticket.findById(req.params.ticketId).select('ownerUserId eventId status qr');
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (String(ticket.ownerUserId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }
    if (ticket.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Ticket is not active' });
    }

    const { rotate = false } = req.body || {};
    const result = await ticketService.issueQr(ticket._id, { rotate });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Issue QR failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to issue QR' });
  }
});

// POST /api/tickets/scan - validate QR and mark used (organizer/admin)
router.post('/scan', scanLimiter, verifyToken, requireRole(['organizer', 'admin']), [body('qr').isString(), body('location').optional().isString(), body('device').optional().isObject()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const { qr, location, device } = req.body;
    const verification = await ticketService.verifyQr(qr);
    if (!verification.ok) {
      return res.status(400).json({ success: false, valid: false, code: verification.code });
    }

    const { ticket, event } = verification;
    // Permission: organizer of event or admin
    const isOrganizer = event && String(event.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    let isEventStaff = false;
    if (!isOrganizer && !isAdmin && event) {
      const staff = await EventStaff.findOne({ eventId: event._id, userId: req.user._id, isActive: true });
      isEventStaff = !!staff;
    }
    if (!isOrganizer && !isAdmin && !isEventStaff) {
      ticket.scanHistory = ticket.scanHistory || [];
      ticket.scanHistory.push({ scannedAt: new Date(), scannedBy: req.user._id, location, result: 'denied' });
      await ticket.save();
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'denied', device });
      return res.status(403).json({ success: false, valid: false, code: 'ACCESS_DENIED' });
    }

    // Validity window
    const now = new Date();
    if ((ticket.metadata?.validFrom && now < ticket.metadata.validFrom) || (ticket.metadata?.validUntil && now > ticket.metadata.validUntil)) {
      ticket.scanHistory = ticket.scanHistory || [];
      ticket.scanHistory.push({ scannedAt: now, scannedBy: req.user._id, location, result: 'invalid' });
      await ticket.save();
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'invalid', device });
      return res.status(400).json({ success: false, valid: false, code: 'INVALID_QR' });
    }

    const result = await ticketService.markUsed(ticket, req.user, { location });
    if (result.alreadyUsed) {
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'already_used', device });
      return res.status(409).json({ success: true, valid: false, code: 'ALREADY_USED', usedAt: result.ticket?.usedAt || ticket.usedAt, usedBy: result.ticket?.usedBy || ticket.usedBy });
    }

    await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'success', device });
    res.json({
      success: true,
      valid: true,
      status: 'used',
      ticket: { id: result.ticket?._id || ticket._id, holderName: `${ticket.holder.firstName} ${ticket.holder.lastName}`, ticketType: ticket.ticketType },
      event: { id: event._id, title: event.title, startDate: event.dates?.startDate }
    });
  } catch (error) {
    console.error('❌ Scan validation failed:', error.message);
    res.status(500).json({ success: false, error: 'Scan validation failed' });
  }
});

module.exports = router;


