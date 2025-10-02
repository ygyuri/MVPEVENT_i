const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { requireOrganizer } = require('../middleware/organizer');
const { rateLimit } = require('../middleware/rateLimit');
const { validateUpdateSchema } = require('../validators/updateSchema');
const updatesController = require('../controllers/updatesController');

const router = express.Router();

/**
 * Validation error handler
 */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'VALIDATION_ERROR', 
      details: errors.array() 
    });
  }
  return false;
};

/**
 * POST /api/events/:eventId/updates
 * Create new update (organizer only)
 */
router.post('/events/:eventId/updates', 
  verifyToken, 
  requireRole(['organizer', 'admin']), 
  requireOrganizer,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 updates per hour
  [
    param('eventId').custom((value) => {
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const slugRegex = /^[a-zA-Z0-9-_]+$/;
      if (!mongoIdRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('Invalid event ID format');
      }
      return true;
    }),
    body('content').isString().isLength({ min: 1, max: 1000 }),
    body('media_urls').optional().isArray(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  validateUpdateSchema,
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.createUpdate(req);
      res.status(201).json(result);
    } catch (error) {
      console.error('Create update error:', error);
      res.status(500).json({ 
        error: 'CREATE_UPDATE_FAILED', 
        message: 'Failed to create update' 
      });
    }
  }
);

/**
 * GET /api/events/:eventId/updates
 * Fetch update history (ticket holders & organizer/admin)
 */
router.get('/events/:eventId/updates', 
  verifyToken,
  [
    param('eventId').custom((value) => {
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const slugRegex = /^[a-zA-Z0-9-_]+$/;
      if (!mongoIdRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('Invalid event ID format');
      }
      return true;
    }),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('before').optional().isISO8601(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.getUpdates(req);
      res.json(result);
    } catch (error) {
      console.error('Get updates error:', error);
      res.status(500).json({ 
        error: 'GET_UPDATES_FAILED', 
        message: 'Failed to fetch updates' 
      });
    }
  }
);

/**
 * POST /api/updates/:updateId/reactions
 * React to update
 */
router.post('/updates/:updateId/reactions', 
  verifyToken,
  [
    param('updateId').isMongoId(),
    body('reaction').isIn(['like', 'love', 'clap', 'wow', 'sad', 'fire', 'thumbs_up', 'heart', 'laugh', 'angry'])
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.addReaction(req);
      res.json(result);
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ 
        error: 'ADD_REACTION_FAILED', 
        message: 'Failed to add reaction' 
      });
    }
  }
);

/**
 * PATCH /api/updates/:updateId
 * Edit update (within 5min window)
 */
router.patch('/updates/:updateId', 
  verifyToken, 
  requireRole(['organizer', 'admin']),
  [
    param('updateId').isMongoId(),
    body('content').optional().isString().isLength({ min: 1, max: 1000 }),
    body('media_urls').optional().isArray(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.editUpdate(req);
      res.json(result);
    } catch (error) {
      console.error('Edit update error:', error);
      res.status(500).json({ 
        error: 'EDIT_UPDATE_FAILED', 
        message: 'Failed to edit update' 
      });
    }
  }
);

/**
 * DELETE /api/updates/:updateId
 * Delete update (organizer only)
 */
router.delete('/updates/:updateId', 
  verifyToken, 
  requireRole(['organizer', 'admin']),
  [
    param('updateId').isMongoId()
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.deleteUpdate(req);
      res.json(result);
    } catch (error) {
      console.error('Delete update error:', error);
      res.status(500).json({ 
        error: 'DELETE_UPDATE_FAILED', 
        message: 'Failed to delete update' 
      });
    }
  }
);

/**
 * GET /api/updates/:updateId
 * Get specific update details
 */
router.get('/updates/:updateId', 
  verifyToken,
  [
    param('updateId').isMongoId()
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.getUpdate(req);
      res.json(result);
    } catch (error) {
      console.error('Get update error:', error);
      res.status(500).json({ 
        error: 'GET_UPDATE_FAILED', 
        message: 'Failed to fetch update' 
      });
    }
  }
);

/**
 * POST /api/updates/:updateId/read
 * Mark update as read
 */
router.post('/updates/:updateId/read', 
  verifyToken,
  [
    param('updateId').isMongoId()
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.markAsRead(req);
      res.json(result);
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ 
        error: 'MARK_READ_FAILED', 
        message: 'Failed to mark update as read' 
      });
    }
  }
);

/**
 * GET /api/events/:eventId/updates/analytics
 * Get update analytics (organizer only)
 */
router.get('/events/:eventId/updates/analytics', 
  verifyToken, 
  requireRole(['organizer', 'admin']),
  requireOrganizer,
  [
    param('eventId').custom((value) => {
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      const slugRegex = /^[a-zA-Z0-9-_]+$/;
      if (!mongoIdRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('Invalid event ID format');
      }
      return true;
    })
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    
    try {
      const result = await updatesController.getAnalytics(req);
      res.json(result);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ 
        error: 'GET_ANALYTICS_FAILED', 
        message: 'Failed to fetch analytics' 
      });
    }
  }
);

module.exports = router;
