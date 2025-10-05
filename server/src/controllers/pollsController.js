const pollService = require('../../services/pollService');
const { broadcastUpdate } = require('../../realtime/socketInstance');
const TicketVerification = require('../middleware/ticketVerification');
const crypto = require('crypto');

/**
 * Polls Controller
 * Handles business logic for poll management and voting
 */
class PollsController {
  
  /**
   * Create a new poll (organizer only) - Phase 2 compatible
   */
  async createPoll(req, res) {
    try {
      const { eventId } = req.params;
      const organizerId = req.user._id; // Phase 2 uses req.user._id

      // Log incoming request meta for debugging (non-sensitive)
      console.log('[POLLS] Create request', {
        url: req.originalUrl,
        method: req.method,
        userId: String(organizerId),
        hasIo: !!req.io
      });

      // Validate input
      const { createPollSchema } = require('../validators/pollSchemas');
      const { error, value } = createPollSchema.validate(req.body, {
        context: { poll_type: req.body.poll_type }
      });
      if (error) {
        console.warn('[POLLS] Create validation failed:', error?.details);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.details 
        });
      }

      // Check rate limit: max 1 poll per 30 seconds
      const recentPoll = await pollService.getRecentPoll(organizerId, eventId);
      if (recentPoll && (Date.now() - recentPoll.created_at < 30000)) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retry_after: 30 - Math.floor((Date.now() - recentPoll.created_at) / 1000)
        });
      }

      // Verify organizer owns event
      const event = await pollService.getEvent(eventId);
      if (event.organizer_id !== String(organizerId)) {
        return res.status(403).json({ error: 'Not authorized to create polls for this event' });
      }

      // Check active polls limit (5 max)
      const activeCount = await pollService.countActivePolls(eventId);
      if (activeCount >= 5) {
        return res.status(400).json({ 
          error: 'Maximum active polls reached',
          message: 'Close an existing poll before creating a new one'
        });
      }

      // Create poll
      const poll = await pollService.createPoll({
        event_id: eventId,
        organizer_id: organizerId,
        ...value
      });

      // Broadcast to attendees via WebSocket
      req.io.to(`event:${eventId}`).emit('new_poll', {
        poll_id: poll.poll_id,
        question: poll.question,
        poll_type: poll.poll_type,
        closes_at: poll.closes_at
      });

      res.status(201).json({
        poll_id: poll.poll_id,
        question: poll.question,
        options: poll.options_json,
        closes_at: poll.closes_at,
        message: 'Poll created successfully'
      });

    } catch (err) {
      console.error('Create poll error:', err);
      const message = err?.message || 'Failed to create poll';
      if (message.includes('Event not found')) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (message.includes('Only event organizers')) {
        return res.status(403).json({ error: 'Not authorized to create polls for this event' });
      }
      if (message.startsWith('Failed to create poll:')) {
        return res.status(400).json({ error: message.replace('Failed to create poll: ', '') });
      }
      return res.status(500).json({ error: 'Failed to create poll' });
    }
  }

  /**
   * List polls for an event - Phase 2 compatible
   */
  async listPolls(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;
      const { status = 'active' } = req.query;

      // Check if user has poll access (organizer or ticket holder)
      if (!req.hasPollAccess) {
        return res.status(403).json({ 
          error: 'Access denied. Valid ticket or organizer access required to view polls.',
          code: 'POLL_ACCESS_DENIED'
        });
      }

      // Get polls with user's vote status
      const polls = await pollService.listPolls(eventId, userId, status);

      res.json({
        polls: polls.map(poll => ({
          poll_id: poll.poll_id,
          question: poll.question,
          description: poll.description,
          poll_type: poll.poll_type,
          options: poll.options_json,
          max_votes: poll.max_votes,
          allow_vote_changes: poll.allow_vote_changes,
          closes_at: poll.closes_at,
          status: poll.status,
          has_voted: poll.has_voted,
          user_vote: poll.user_vote, // only if has_voted = true
          time_remaining: Math.max(0, new Date(poll.closes_at) - Date.now())
        }))
      });

    } catch (err) {
      console.error('List polls error:', err);
      res.status(500).json({ error: 'Failed to fetch polls' });
    }
  }

  /**
   * Get single poll details
   */
  async getPoll(req, res) {
    try {
      const { pollId } = req.params;
      const userId = req.user._id;

      // Get poll details
      const poll = await pollService.getPollById(pollId);

      // Check if user has voted
      const userVote = await pollService.getUserVote(pollId, userId);

      // Get poll results if user has voted or poll is closed
      let results = null;
      if (userVote || poll.status === 'closed') {
        results = await pollService.getPollResults(pollId);
      }

      return res.json({
        success: true,
        data: {
          poll_id: poll._id,
          event_id: poll.event,
          question: poll.question,
          options: poll.options,
          poll_type: poll.pollType,
          max_votes: poll.maxVotes,
          allow_anonymous: poll.allowAnonymous,
          show_results_before_vote: poll.showResultsBeforeVote,
          status: poll.status,
          closes_at: poll.closesAt,
          created_at: poll.createdAt,
          user_vote: userVote ? {
            option_ids: userVote.optionIds,
            voted_at: userVote.createdAt
          } : null,
          results: results
        }
      });

    } catch (error) {
      console.error('Get poll error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Submit vote on poll - Phase 2 compatible
   */
  async submitVote(req, res) {
    try {
      const { pollId } = req.params;
      const { option_ids } = req.body; // Array of selected option IDs
      const userId = req.user._id; // Phase 2 uses req.user._id

      // Validate option_ids is array
      if (!Array.isArray(option_ids) || option_ids.length === 0) {
        return res.status(400).json({ error: 'option_ids must be a non-empty array' });
      }

      // Get poll details
      const poll = await pollService.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      // Check poll is active
      if (poll.status !== 'active') {
        return res.status(400).json({ error: 'Poll is closed' });
      }

      // Check poll hasn't expired
      if (new Date(poll.closes_at) < new Date()) {
        return res.status(400).json({ error: 'Poll has expired' });
      }

      // Verify user has ticket
      const hasTicket = await pollService.verifyTicket(userId, poll.event_id);
      if (!hasTicket) {
        return res.status(403).json({ error: 'Valid ticket required to vote' });
      }

      // Validate number of votes
      if (option_ids.length > poll.max_votes) {
        return res.status(400).json({ 
          error: `Maximum ${poll.max_votes} vote(s) allowed` 
        });
      }

      // Validate option IDs exist in poll
      const validOptions = poll.options_json.map(opt => opt.id);
      const invalidOptions = option_ids.filter(id => !validOptions.includes(id));
      if (invalidOptions.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid option IDs', 
          invalid: invalidOptions 
        });
      }

      // Check if user already voted
      const existingVote = await pollService.getUserVote(pollId, userId);

      if (existingVote && !poll.allow_vote_changes) {
        return res.status(400).json({ 
          error: 'Vote changes not allowed for this poll' 
        });
      }

      // Generate anonymous token if needed
      let anonymousTokenHash = null;
      if (poll.allow_anonymous) {
        const token = crypto.randomBytes(32).toString('hex');
        anonymousTokenHash = crypto
          .createHash('sha256')
          .update(token + userId)
          .digest('hex');
      }

      // Submit or update vote
      const vote = await pollService.submitVote({
        poll_id: pollId,
        user_id: poll.allow_anonymous ? null : userId,
        anonymous_token_hash: anonymousTokenHash,
        option_ids,
        is_anonymous: poll.allow_anonymous,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }, existingVote);

      // Refresh materialized view
      await pollService.refreshResults(pollId);

      // Get updated results
      const results = await pollService.getResults(pollId);

      // Broadcast vote update via WebSocket (throttled)
      req.io.to(`poll:${pollId}`).emit('vote_update', {
        poll_id: pollId,
        total_votes: results.total_votes,
        // Don't send full results yet (privacy)
      });

      res.json({
        message: 'Vote submitted successfully',
        vote_id: vote.vote_id,
        can_view_results: true
      });

    } catch (err) {
      console.error('Submit vote error:', err);
      res.status(500).json({ error: 'Failed to submit vote' });
    }
  }

  /**
   * Submit vote on poll (legacy method)
   */
  async submitVoteLegacy(req, res) {
    try {
      const { pollId } = req.params;
      const { optionIds, anonymousToken } = req.body;
      const userId = req.user._id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // Validate vote data
      if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one option must be selected'
        });
      }

      // Submit vote
      const vote = await pollService.voteOnPoll(
        pollId,
        optionIds,
        userId,
        anonymousToken,
        ipAddress,
        userAgent
      );

      // Get updated poll results
      const results = await pollService.getPollResults(pollId);

      // Broadcast vote to WebSocket clients
      try {
        const poll = await pollService.getPollById(pollId);
        broadcastUpdate(poll.event.toString(), {
          type: 'poll_vote',
          poll_id: pollId,
          event_id: poll.event,
          total_votes: results.totalVotes,
          results: results.results,
          timestamp: new Date()
        });
      } catch (socketError) {
        console.warn('Failed to broadcast poll vote:', socketError.message);
      }

      return res.status(201).json({
        success: true,
        data: {
          vote_id: vote._id,
          poll_id: pollId,
          option_ids: vote.optionIds,
          voted_at: vote.createdAt,
          results: results
        }
      });

    } catch (error) {
      console.error('Submit vote error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get poll results - Phase 2 compatible
   */
  async getResults(req, res) {
    try {
      const { pollId } = req.params;
      const userId = req.user._id; // Phase 2 uses req.user._id

      // Get poll
      const poll = await pollService.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      // Check if user has voted (required to see results for active polls)
      const userVote = await pollService.getUserVote(pollId, userId);

      if (poll.status === 'active' && !userVote) {
        return res.status(403).json({ 
          error: 'You must vote to see results',
          message: 'Submit your vote first to view live results'
        });
      }

      // Get results from materialized view
      const results = await pollService.getResults(pollId);

      // Calculate participation rate
      const ticketCount = await pollService.getTicketCount(poll.event_id);
      const participationRate = (results.total_votes / ticketCount * 100).toFixed(2);

      res.json({
        poll_id: pollId,
        question: poll.question,
        status: poll.status,
        closes_at: poll.closes_at,
        closed_at: poll.closed_at,
        results: results.results, // JSON object with vote counts per option
        analytics: {
          total_votes: results.total_votes,
          participation_rate: parseFloat(participationRate),
          identified_votes: results.identified_votes,
          anonymous_votes: results.anonymous_votes,
          ticket_holders: ticketCount
        },
        user_vote: userVote ? userVote.option_ids : null
      });

    } catch (err) {
      console.error('Get results error:', err);
      res.status(500).json({ error: 'Failed to fetch results' });
    }
  }

  /**
   * Close poll early - Phase 2 compatible
   */
  async closePoll(req, res) {
    try {
      const { pollId } = req.params;
      const organizerId = req.user._id; // Phase 2 uses req.user._id

      // Get poll
      const poll = await pollService.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      // Verify organizer owns the poll
      if (poll.organizer_id !== organizerId) {
        return res.status(403).json({ error: 'Not authorized to close this poll' });
      }

      // Check poll is active
      if (poll.status !== 'active') {
        return res.status(400).json({ error: 'Poll is already closed' });
      }

      // Close poll
      await pollService.closePoll(pollId);

      // Get final results
      const results = await pollService.getResults(pollId);

      // Broadcast poll closure to all attendees
      req.io.to(`event:${poll.event_id}`).emit('poll_closed', {
        poll_id: pollId,
        final_results: results.results,
        total_votes: results.total_votes
      });

      res.json({
        message: 'Poll closed successfully',
        final_results: results.results,
        total_votes: results.total_votes
      });

    } catch (err) {
      console.error('Close poll error:', err);
      res.status(500).json({ error: 'Failed to close poll' });
    }
  }

  /**
   * Update poll (organizer only)
   */
  async updatePoll(req, res) {
    try {
      const { pollId } = req.params;
      const organizerId = req.user._id;

      // Update poll
      const poll = await pollService.updatePoll(pollId, req.body, organizerId);

      return res.json({
        success: true,
        data: {
          poll_id: poll._id,
          event_id: poll.event,
          question: poll.question,
          options: poll.options,
          poll_type: poll.pollType,
          max_votes: poll.maxVotes,
          allow_anonymous: poll.allowAnonymous,
          show_results_before_vote: poll.showResultsBeforeVote,
          status: poll.status,
          closes_at: poll.closesAt,
          updated_at: poll.updatedAt
        }
      });

    } catch (error) {
      console.error('Update poll error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete poll (organizer only)
   */
  async deletePoll(req, res) {
    try {
      const { pollId } = req.params;
      const organizerId = req.user._id;

      // Delete poll
      const poll = await pollService.deletePoll(pollId, organizerId);

      // Broadcast poll deletion to WebSocket clients
      try {
        broadcastUpdate(poll.event.toString(), {
          type: 'poll_deleted',
          poll_id: pollId,
          event_id: poll.event,
          timestamp: new Date()
        });
      } catch (socketError) {
        console.warn('Failed to broadcast poll deletion:', socketError.message);
      }

      return res.json({
        success: true,
        data: {
          poll_id: pollId,
          deleted: true,
          deleted_at: poll.deletedAt
        }
      });

    } catch (error) {
      console.error('Delete poll error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate anonymous token
   */
  async generateAnonymousToken(req, res) {
    try {
      const token = pollService.generateAnonymousToken();

      return res.json({
        success: true,
        data: {
          token: token
        }
      });

    } catch (error) {
      console.error('Generate anonymous token error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's vote on a poll
   */
  async getUserVote(req, res) {
    try {
      const { pollId } = req.params;
      const { anonymousToken } = req.query;
      const userId = req.user._id;

      const vote = await pollService.getUserVote(pollId, userId, anonymousToken);

      return res.json({
        success: true,
        data: vote ? {
          vote_id: vote._id,
          poll_id: pollId,
          option_ids: vote.optionIds,
          is_anonymous: vote.isAnonymous,
          voted_at: vote.createdAt
        } : null
      });

    } catch (error) {
      console.error('Get user vote error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Enrich polls with user's vote status
   */
  async enrichPollsWithUserVotes(polls, userId) {
    const enrichedPolls = await Promise.all(polls.map(async (poll) => {
      try {
        const userVote = await pollService.getUserVote(poll._id, userId);
        
        return {
          poll_id: poll._id,
          event_id: poll.event,
          question: poll.question,
          options: poll.options,
          poll_type: poll.pollType,
          max_votes: poll.maxVotes,
          allow_anonymous: poll.allowAnonymous,
          show_results_before_vote: poll.showResultsBeforeVote,
          status: poll.status,
          closes_at: poll.closesAt,
          created_at: poll.createdAt,
          user_has_voted: !!userVote,
          user_vote: userVote ? {
            option_ids: userVote.optionIds,
            voted_at: userVote.createdAt
          } : null
        };
      } catch (error) {
        console.error('Error enriching poll with user vote:', error);
        return {
          poll_id: poll._id,
          event_id: poll.event,
          question: poll.question,
          options: poll.options,
          poll_type: poll.pollType,
          max_votes: poll.maxVotes,
          allow_anonymous: poll.allowAnonymous,
          show_results_before_vote: poll.showResultsBeforeVote,
          status: poll.status,
          closes_at: poll.closesAt,
          created_at: poll.createdAt,
          user_has_voted: false,
          user_vote: null
        };
      }
    }));

    return enrichedPolls;
  }
}

module.exports = new PollsController();
