const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const Poll = require('../models/Poll');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const router = express.Router();

// Simple validation middleware
const validatePollCreation = [
  body('question')
    .isLength({ min: 10, max: 300 })
    .withMessage('Question must be 10-300 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('poll_type')
    .isIn(['general', 'artist_selection', 'theme_selection', 'feature_selection'])
    .withMessage('Invalid poll type'),
  body('options')
    .isArray({ min: 2, max: 10 })
    .withMessage('Must have 2-10 options'),
  body('options.*.label')
    .isLength({ min: 1, max: 200 })
    .withMessage('Option label must be 1-200 characters'),
  body('max_votes')
    .isInt({ min: 1, max: 10 })
    .withMessage('Max votes must be 1-10'),
  body('allow_anonymous')
    .isBoolean()
    .withMessage('allow_anonymous must be boolean'),
  body('allow_vote_changes')
    .isBoolean()
    .withMessage('allow_vote_changes must be boolean'),
  body('closes_at')
    .isISO8601()
    .withMessage('Valid closing date is required')
];

// Simple poll creation endpoint (no Redis dependency)
router.post(
  '/events/:eventId/polls/simple',
  verifyToken,
  validatePollCreation,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { eventId } = req.params;
      const organizerId = req.user._id;
      const {
        question,
        description,
        poll_type,
        options,
        max_votes,
        allow_anonymous,
        allow_vote_changes,
        closes_at
      } = req.body;

      console.log('[POLLS] Creating poll:', {
        eventId,
        organizerId: organizerId.toString(),
        question: question.substring(0, 50) + '...',
        poll_type,
        optionsCount: options.length
      });

      // Verify event exists and user is organizer
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      if (event.organizer.toString() !== organizerId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only event organizers can create polls'
        });
      }

      // Check active polls limit (5 max)
      const activePollsCount = await Poll.countDocuments({
        event: eventId,
        status: 'active',
        deletedAt: null
      });

      if (activePollsCount >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 active polls allowed per event',
          message: 'Close an existing poll before creating a new one'
        });
      }

      // Validate closing date is in the future
      const closingDate = new Date(closes_at);
      if (closingDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Poll must close in the future'
        });
      }

      // Validate options
      const validOptions = options.filter(opt => opt.label && opt.label.trim());
      if (validOptions.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 valid options required'
        });
      }

      // Check for duplicate option labels
      const optionLabels = validOptions.map(opt => opt.label.toLowerCase().trim());
      const uniqueLabels = new Set(optionLabels);
      if (uniqueLabels.size !== optionLabels.length) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate option labels are not allowed'
        });
      }

      // Artist selection validation
      if (poll_type === 'artist_selection') {
        const missingArtistNames = validOptions.some(opt => !opt.artist_name || !opt.artist_name.trim());
        if (missingArtistNames) {
          return res.status(400).json({
            success: false,
            error: 'Artist name is required for all options in artist selection poll'
          });
        }
      }

      // Transform options with unique IDs
      const transformedOptions = validOptions.map((opt, index) => ({
        id: `opt_${Date.now()}_${index}`,
        label: opt.label.trim(),
        description: opt.description?.trim() || '',
        image_url: opt.image_url?.trim() || '',
        ...(opt.artist_name && { artist_name: opt.artist_name.trim() }),
        ...(opt.artist_genre && { artist_genre: opt.artist_genre.trim() }),
        ...(opt.theme_color_hex && { theme_color_hex: opt.theme_color_hex.trim() }),
        ...(opt.feature_cost && { feature_cost: parseFloat(opt.feature_cost) })
      }));

      // Create poll
      const poll = new Poll({
        event: eventId,
        organizer: organizerId,
        question: question.trim(),
        description: description?.trim() || '',
        options: transformedOptions,
        pollType: poll_type,
        maxVotes: max_votes,
        allowAnonymous: allow_anonymous,
        allow_vote_changes: allow_vote_changes,
        closesAt: closingDate,
        status: 'active'
      });

      const savedPoll = await poll.save();

      console.log('[POLLS] Poll created successfully:', savedPoll._id);

      // Return response in Phase 2 format
      const response = {
        success: true,
        poll_id: savedPoll._id.toString(),
        event_id: savedPoll.event.toString(),
        organizer_id: savedPoll.organizer.toString(),
        question: savedPoll.question,
        description: savedPoll.description,
        poll_type: savedPoll.pollType,
        options: savedPoll.options,
        max_votes: savedPoll.maxVotes,
        allow_anonymous: savedPoll.allowAnonymous,
        allow_vote_changes: savedPoll.allow_vote_changes,
        closes_at: savedPoll.closesAt,
        status: savedPoll.status,
        created_at: savedPoll.createdAt,
        message: 'Poll created successfully'
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('[POLLS] Create poll error:', error);
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format'
        });
      }

      // Generic server error
      res.status(500).json({
        success: false,
        error: 'Failed to create poll',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Simple poll listing endpoint
router.get(
  '/events/:eventId/polls',
  verifyToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;

      console.log('[POLLS] Listing polls for event:', eventId);

      // Verify user has ticket to event
      const hasTicket = await Ticket.findOne({
        eventId: eventId,
        ownerUserId: userId,
        status: 'active'
      });

      if (!hasTicket) {
        return res.status(403).json({
          success: false,
          error: 'Valid ticket required to view polls'
        });
      }

      // Get active polls
      const polls = await Poll.find({
        event: eventId,
        status: 'active',
        deletedAt: null,
        closesAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      console.log('[POLLS] Found polls:', polls.length);

      // Transform to Phase 2 format
      const formattedPolls = polls.map(poll => ({
        poll_id: poll._id.toString(),
        event_id: poll.event.toString(),
        organizer_id: poll.organizer.toString(),
        question: poll.question,
        description: poll.description,
        poll_type: poll.pollType,
        options: poll.options,
        max_votes: poll.maxVotes,
        allow_anonymous: poll.allowAnonymous,
        allow_vote_changes: poll.allow_vote_changes,
        closes_at: poll.closesAt,
        status: poll.status,
        created_at: poll.createdAt,
        time_remaining: Math.max(0, poll.closesAt - new Date())
      }));

      res.json({
        success: true,
        polls: formattedPolls
      });

    } catch (error) {
      console.error('[POLLS] List polls error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch polls'
      });
    }
  }
);

module.exports = router;
