const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole, optionalAuth } = require('../middleware/auth');
const pollsController = require('../src/controllers/pollsController');
const { verifyOrganizer, verifyPollOrganizer, canCreatePoll } = require('../src/middleware/verifyOrganizer');
const { verifyTicketHolder, verifyVotingAccess, verifyResultsAccess, checkPollAccess } = require('../src/middleware/verifyTicketHolder');
const { 
  pollCreationLimiter, 
  votingLimiter, 
  resultsLimiter, 
  pollManagementLimiter,
  anonymousTokenLimiter,
  rateLimitPollCreation,
  rateLimitVoting,
  rateLimitAnonymousVoting
} = require('../src/middleware/rateLimitPoll');

const router = express.Router();

// Validation middleware
const validatePollCreation = [
  body('question').isLength({ min: 1, max: 500 }).withMessage('Question must be 1-500 characters'),
  body('options').isArray({ min: 2, max: 10 }).withMessage('Must have 2-10 options'),
  body('options.*.text').isLength({ min: 1, max: 200 }).withMessage('Option text must be 1-200 characters'),
  body('pollType').optional().isIn(['single_choice', 'multiple_choice']).withMessage('Invalid poll type'),
  body('maxVotes').optional().isInt({ min: 1, max: 10 }).withMessage('Max votes must be 1-10'),
  body('allowAnonymous').optional().isBoolean().withMessage('allowAnonymous must be boolean'),
  body('showResultsBeforeVote').optional().isBoolean().withMessage('showResultsBeforeVote must be boolean'),
  body('closesAt').isISO8601().withMessage('Valid closing date is required')
];

const validatePollUpdate = [
  body('question').optional().isLength({ min: 1, max: 500 }).withMessage('Question must be 1-500 characters'),
  body('options').optional().isArray({ min: 2, max: 10 }).withMessage('Must have 2-10 options'),
  body('options.*.text').optional().isLength({ min: 1, max: 200 }).withMessage('Option text must be 1-200 characters'),
  body('pollType').optional().isIn(['single_choice', 'multiple_choice']).withMessage('Invalid poll type'),
  body('maxVotes').optional().isInt({ min: 1, max: 10 }).withMessage('Max votes must be 1-10'),
  body('allowAnonymous').optional().isBoolean().withMessage('allowAnonymous must be boolean'),
  body('showResultsBeforeVote').optional().isBoolean().withMessage('showResultsBeforeVote must be boolean'),
  body('closesAt').optional().isISO8601().withMessage('Valid closing date is required')
];

const validateVote = [
  body('optionIds').isArray({ min: 1 }).withMessage('At least one option must be selected'),
  body('optionIds.*').isString().withMessage('Option IDs must be strings'),
  body('anonymousToken').optional().isString().withMessage('Anonymous token must be string')
];

// Create poll (organizer only) - Phase 2 compatible
router.post(
  '/events/:eventId/polls',
  verifyToken,
  verifyOrganizer,
  rateLimitPollCreation, // Max 5 active polls per event
  validatePollCreation,
  pollsController.createPoll
);

// List active polls for an event (ticket holders + organizers) - Phase 2 compatible
router.get(
  '/events/:eventId/polls',
  verifyToken,
  checkPollAccess, // More flexible middleware that allows organizers
  pollsController.listPolls
);

// Get single poll details
router.get(
  '/polls/:pollId',
  verifyToken,
  verifyTicketHolder,
  pollsController.getPoll
);

// Submit vote - Phase 2 compatible
router.post(
  '/polls/:pollId/vote',
  verifyToken,
  verifyVotingAccess,
  rateLimitVoting,
  rateLimitAnonymousVoting,
  validateVote,
  pollsController.submitVote
);

// Get poll results (only after voting or if poll closed) - Phase 2 compatible
router.get(
  '/polls/:pollId/results',
  verifyToken,
  verifyResultsAccess,
  resultsLimiter,
  pollsController.getResults
);

// Close poll early (organizer only) - Phase 2 compatible
router.delete(
  '/polls/:pollId',
  verifyToken,
  verifyPollOrganizer,
  pollManagementLimiter,
  pollsController.closePoll
);

// Generate anonymous token
router.post(
  '/anonymous-token',
  anonymousTokenLimiter,
  pollsController.generateAnonymousToken
);

// Get user's vote on a poll
router.get(
  '/polls/:pollId/vote',
  verifyToken,
  verifyTicketHolder,
  pollsController.getUserVote
);

// Update poll (organizer only)
router.put(
  '/polls/:pollId',
  verifyToken,
  verifyPollOrganizer,
  pollManagementLimiter,
  validatePollUpdate,
  pollsController.updatePoll
);

// Delete poll (organizer only)
router.delete(
  '/polls/:pollId/delete',
  verifyToken,
  verifyPollOrganizer,
  pollManagementLimiter,
  pollsController.deletePoll
);

// Admin endpoint to auto-close expired polls
router.post(
  '/admin/auto-close',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const pollService = require('../services/pollService');
      const closedPolls = await pollService.autoCloseExpiredPolls();

      res.json({
        success: true,
        data: {
          closedPolls: closedPolls,
          count: closedPolls.length
        }
      });
    } catch (error) {
      console.error('Auto-close polls error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
