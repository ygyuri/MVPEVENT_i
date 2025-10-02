const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const UpdateService = require('../services/updateService');
const EventUpdate = require('../models/EventUpdate');

// Simple rate limit for organizer posts: 10/hour per organizer
const rateLimit = require('express-rate-limit');
const organizerPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `org:${req.user?._id}`
});

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
};

// POST /api/events/:eventId/updates - Create new update (organizer only)
router.post('/events/:eventId/updates', verifyToken, requireRole(['organizer','admin']), organizerPostLimiter, [
  param('eventId').custom((value) => {
    // Allow both MongoDB ObjectId and slug format
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    if (!mongoIdRegex.test(value) && !slugRegex.test(value)) {
      throw new Error('Invalid event ID format');
    }
    return true;
  }),
  body('content').isString().isLength({ min: 1, max: 1000 }),
  body('mediaUrls').optional().isArray(),
  body('priority').optional().isIn(['low','normal','high'])
], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const { eventId } = req.params;
    const check = await UpdateService.validateOrganizer(eventId, req.user);
    if (!check.ok) return res.status(check.code).json({ error: check.msg });

    // basic moderation: auto-approve for now, but allow flagging later
    const payload = { ...req.body, moderation: { status: 'approved' } };
    const doc = await UpdateService.createUpdate(eventId, req.user._id, payload);
    // Broadcast via socket if available
    try {
      const { broadcastUpdate } = require('../realtime/socketInstance');
      broadcastUpdate?.(eventId, { id: doc._id, content: doc.content, mediaUrls: doc.mediaUrls, priority: doc.priority, createdAt: doc.createdAt });
    } catch (e) {}
    res.status(201).json({ success: true, data: { id: doc._id } });
  } catch (e) {
    res.status(500).json({ error: 'FAILED_TO_CREATE_UPDATE' });
  }
});

// GET /api/events/:eventId/updates - Fetch update history (ticket holders & organizer/admin)
router.get('/events/:eventId/updates', verifyToken, [
  param('eventId').custom((value) => {
    // Allow both MongoDB ObjectId and slug format
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    if (!mongoIdRegex.test(value) && !slugRegex.test(value)) {
      throw new Error('Invalid event ID format');
    }
    return true;
  }),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const { eventId } = req.params;
    const access = await UpdateService.validateReader(eventId, req.user);
    if (!access.ok) return res.status(access.code).json({ error: access.msg });
    const updates = await UpdateService.listUpdates(eventId, { limit: req.query.limit, before: req.query.before, onlyApproved: true });
    res.json({ success: true, data: updates });
  } catch (e) {
    res.status(500).json({ error: 'FAILED_TO_LIST_UPDATES' });
  }
});

// POST /api/updates/:updateId/reactions - React to update
router.post('/updates/:updateId/reactions', verifyToken, [
  param('updateId').isMongoId(),
  body('reactionType').isIn(['like','love','clap','wow','sad'])
], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const update = await EventUpdate.findById(req.params.updateId).select('eventId');
    if (!update) return res.status(404).json({ error: 'Not found' });
    const access = await UpdateService.validateReader(update.eventId, req.user);
    if (!access.ok) return res.status(access.code).json({ error: access.msg });
    await UpdateService.react(update._id, req.user._id, req.body.reactionType);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'FAILED_TO_REACT' });
  }
});

// PATCH /api/updates/:updateId - Edit update (within 5min window)
router.patch('/updates/:updateId', verifyToken, requireRole(['organizer','admin']), [
  param('updateId').isMongoId(),
  body('content').optional().isString().isLength({ min: 1, max: 1000 }),
  body('mediaUrls').optional().isArray(),
  body('priority').optional().isIn(['low','normal','high']),
  body('moderation').optional().isObject()
], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const result = await UpdateService.edit(req.params.updateId, req.user, req.body);
    if (!result.ok) return res.status(result.code).json({ error: result.msg });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'FAILED_TO_EDIT' });
  }
});

// DELETE /api/updates/:updateId - Delete update (organizer only)
router.delete('/updates/:updateId', verifyToken, requireRole(['organizer','admin']), [
  param('updateId').isMongoId()
], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const result = await UpdateService.remove(req.params.updateId, req.user);
    if (!result.ok) return res.status(result.code).json({ error: result.msg });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'FAILED_TO_DELETE' });
  }
});

module.exports = router;


