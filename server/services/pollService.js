const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const crypto = require('crypto');

class PollService {
  async getRecentPoll(organizerId, eventId) {
    try {
      const recent = await Poll
        .findOne({ organizer: organizerId, event: eventId })
        .sort({ createdAt: -1 })
        .select('createdAt');
      return recent ? { created_at: recent.createdAt.getTime() } : null;
    } catch (error) {
      throw new Error(`Failed to get recent poll: ${error.message}`);
    }
  }

  async countActivePolls(eventId) {
    try {
      const count = await Poll.countDocuments({
        event: eventId,
        status: 'active',
        deletedAt: null
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to count active polls: ${error.message}`);
    }
  }

  async listPolls(eventId, userId, status = 'active') {
    try {
      const polls = await Poll.find({
        event: eventId,
        status,
        deletedAt: null
      }).sort({ createdAt: -1 });

      const results = [];
      for (const poll of polls) {
        const vote = await PollVote.findOne({ poll: poll._id, user: userId });
        
        // Convert to Phase 2 format
        results.push({
          poll_id: poll._id.toString(),
          event_id: poll.event.toString(),
          organizer_id: poll.organizer.toString(),
          question: poll.question,
          description: poll.description,
          poll_type: poll.pollType,
          options_json: poll.options,
          allow_anonymous: poll.allowAnonymous,
          max_votes: poll.maxVotes,
          allow_vote_changes: poll.allow_vote_changes,
          closes_at: poll.closesAt,
          status: poll.status,
          created_at: poll.createdAt,
          has_voted: !!vote,
          user_vote: vote ? vote.optionIds : null
        });
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to list polls: ${error.message}`);
    }
  }

  async verifyTicket(userId, eventId) {
    try {
      const ticket = await Ticket.findOne({ eventId, ownerUserId: userId }).populate('orderId');
      if (!ticket) return false;
      if (ticket.status !== 'active') return false;
      if (ticket.orderId && ticket.orderId.status !== 'paid') return false;
      return true;
    } catch (error) {
      throw new Error(`Failed to verify ticket: ${error.message}`);
    }
  }

  // Phase 2 required methods
  async getEvent(eventId) {
    try {
      const event = await Event.findById(eventId).select('organizer');
      if (!event) {
        throw new Error('Event not found');
      }
      return { organizer_id: event.organizer.toString() };
    } catch (error) {
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  async getPoll(pollId) {
    try {
      const poll = await Poll.findOne({ _id: pollId, deletedAt: null });
      if (!poll) {
        throw new Error('Poll not found');
      }
      
      // Convert MongoDB poll to Phase 2 format
      return {
        poll_id: poll._id.toString(),
        event_id: poll.event.toString(),
        organizer_id: poll.organizer.toString(),
        question: poll.question,
        description: poll.description,
        poll_type: poll.pollType,
        options_json: poll.options,
        allow_anonymous: poll.allowAnonymous,
        max_votes: poll.maxVotes,
        allow_vote_changes: poll.allow_vote_changes,
        closes_at: poll.closesAt,
        status: poll.status,
        created_at: poll.createdAt,
        closed_at: poll.closedEarlyAt
      };
    } catch (error) {
      throw new Error(`Failed to get poll: ${error.message}`);
    }
  }

  async getUserVote(pollId, userId) {
    try {
      const vote = await PollVote.findOne({ poll: pollId, user: userId });
      if (!vote) return null;
      
      return {
        vote_id: vote._id.toString(),
        poll_id: vote.poll.toString(),
        user_id: vote.user.toString(),
        option_ids: vote.optionIds,
        is_anonymous: vote.isAnonymous,
        created_at: vote.createdAt,
        updated_at: vote.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get user vote: ${error.message}`);
    }
  }

  async getTicketCount(eventId) {
    try {
      const count = await Ticket.countDocuments({
        eventId: eventId,
        status: 'active'
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to get ticket count: ${error.message}`);
    }
  }

  // Create a new poll - Phase 2 compatible
  async createPoll(pollData) {
    try {
      const {
        event_id,
        organizer_id,
        question,
        description,
        poll_type,
        options,
        allow_anonymous,
        max_votes,
        allow_vote_changes,
        closes_at
      } = pollData;

      // Validate event exists and user is organizer
      const event = await Event.findById(event_id);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizer.toString() !== organizer_id) {
        throw new Error('Only event organizers can create polls');
      }

      // Transform options array with unique IDs (Phase 2 format)
      const optionsWithIds = options.map((opt, index) => ({
        id: `opt_${Date.now()}_${index}`,
        label: opt.label,
        description: opt.description || '',
        image_url: opt.image_url || '',
        ...(opt.artist_name && { artist_name: opt.artist_name }),
        ...(opt.artist_genre && { artist_genre: opt.artist_genre }),
        ...(opt.theme_color_hex && { theme_color_hex: opt.theme_color_hex }),
        ...(opt.feature_cost && { feature_cost: opt.feature_cost })
      }));

      // Create poll
      const poll = new Poll({
        event: event_id,
        organizer: organizer_id,
        question: question,
        description: description,
        options: optionsWithIds,
        pollType: poll_type,
        maxVotes: max_votes,
        allowAnonymous: allow_anonymous,
        allow_vote_changes: allow_vote_changes,
        closesAt: new Date(closes_at),
        status: 'active'
      });

      await poll.save();

      // Return in Phase 2 format
      return {
        poll_id: poll._id.toString(),
        event_id: poll.event.toString(),
        organizer_id: poll.organizer.toString(),
        question: poll.question,
        description: poll.description,
        poll_type: poll.pollType,
        options_json: poll.options,
        allow_anonymous: poll.allowAnonymous,
        max_votes: poll.maxVotes,
        allow_vote_changes: poll.allow_vote_changes,
        closes_at: poll.closesAt,
        status: poll.status,
        created_at: poll.createdAt
      };
    } catch (error) {
      throw new Error(`Failed to create poll: ${error.message}`);
    }
  }

  // Update an existing poll
  async updatePoll(pollId, updateData, organizerId) {
    try {
      const poll = await Poll.findOne({
        _id: pollId,
        organizer: organizerId,
        deletedAt: null
      });

      if (!poll) {
        throw new Error('Poll not found or access denied');
      }

      // Can't update closed polls
      if (poll.status === 'closed') {
        throw new Error('Cannot update closed polls');
      }

      // Validate update data
      if (updateData.options) {
        this.validateOptions(updateData.options);
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key === 'options') {
          poll.options = updateData.options;
        } else if (key === 'closesAt') {
          poll.closesAt = new Date(updateData.closesAt);
        } else if (poll.schema.paths[key]) {
          poll[key] = updateData[key];
        }
      });

      await poll.save();
      return poll;
    } catch (error) {
      throw new Error(`Failed to update poll: ${error.message}`);
    }
  }

  // Legacy methods removed - using Phase 2 getPoll() method instead

  // Phase 2 submitVote method
  async submitVote(voteData, existingVote) {
    try {
      const {
        poll_id,
        user_id,
        anonymous_token_hash,
        option_ids,
        is_anonymous,
        ip_address,
        user_agent
      } = voteData;

      if (existingVote) {
        // Update existing vote
        existingVote.optionIds = option_ids;
        existingVote.ipAddress = ip_address;
        existingVote.userAgent = user_agent;
        await existingVote.save();
        
        return {
          vote_id: existingVote._id.toString(),
          poll_id: existingVote.poll.toString(),
          user_id: existingVote.user ? existingVote.user.toString() : null,
          option_ids: existingVote.optionIds,
          is_anonymous: existingVote.isAnonymous,
          created_at: existingVote.createdAt,
          updated_at: existingVote.updatedAt
        };
      } else {
        // Create new vote
        const vote = new PollVote({
          poll: poll_id,
          user: user_id,
          optionIds: option_ids,
          isAnonymous: is_anonymous,
          anonymousTokenHash: anonymous_token_hash,
          ipAddress: ip_address,
          userAgent: user_agent
        });

        await vote.save();
        
        return {
          vote_id: vote._id.toString(),
          poll_id: vote.poll.toString(),
          user_id: vote.user ? vote.user.toString() : null,
          option_ids: vote.optionIds,
          is_anonymous: vote.isAnonymous,
          created_at: vote.createdAt,
          updated_at: vote.updatedAt
        };
      }
    } catch (error) {
      throw new Error(`Failed to submit vote: ${error.message}`);
    }
  }

  // Phase 2 refreshResults method
  async refreshResults(pollId) {
    try {
      // In MongoDB, we don't need to refresh materialized views
      // Results are calculated on-demand via aggregation
      return true;
    } catch (error) {
      throw new Error(`Failed to refresh results: ${error.message}`);
    }
  }

  // Phase 2 getResults method
  async getResults(pollId) {
    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      // Get vote counts per option using aggregation
      const voteCounts = await PollVote.aggregate([
        { $match: { poll: poll._id } },
        { $unwind: '$optionIds' },
        { $group: { _id: '$optionIds', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Get overall statistics
      const stats = await PollVote.aggregate([
        { $match: { poll: poll._id } },
        {
          $group: {
            _id: null,
            total_votes: { $sum: 1 },
            anonymous_votes: { $sum: { $cond: ['$isAnonymous', 1, 0] } },
            identified_votes: { $sum: { $cond: ['$isAnonymous', 0, 1] } }
          }
        }
      ]);

      const totalVotes = stats[0]?.total_votes || 0;
      const anonymousVotes = stats[0]?.anonymous_votes || 0;
      const identifiedVotes = stats[0]?.identified_votes || 0;

      // Build results object
      const results = {};
      poll.options.forEach(option => {
        const voteCount = voteCounts.find(vc => vc._id === option.id)?.count || 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100 * 100) / 100 : 0;
        
        results[option.id] = {
          text: option.label,
          votes: voteCount,
          percentage: percentage
        };
      });

      return {
        poll_id: poll._id.toString(),
        total_votes: totalVotes,
        anonymous_votes: anonymousVotes,
        identified_votes: identifiedVotes,
        results: results
      };
    } catch (error) {
      throw new Error(`Failed to get results: ${error.message}`);
    }
  }

  // Phase 2 closePoll method
  async closePoll(pollId) {
    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      poll.status = 'closed';
      poll.closedEarlyAt = new Date();
      await poll.save();

      // Refresh results one final time
      await this.refreshResults(pollId);

      return {
        poll_id: poll._id.toString(),
        status: 'closed',
        closed_at: poll.closedEarlyAt
      };
    } catch (error) {
      throw new Error(`Failed to close poll: ${error.message}`);
    }
  }

  // Vote on a poll (legacy method - keeping for compatibility)
  async voteOnPoll(pollId, optionIds, userId = null, anonymousToken = null, ipAddress = null, userAgent = null) {
    try {
      const poll = await this.getPoll(pollId);
      
      // Check if poll is active and not expired
      if (!poll.canVote) {
        throw new Error('Poll is not available for voting');
      }

      // Validate option IDs
      this.validateVoteOptions(poll, optionIds);

      // Check if user has already voted
      let existingVote = null;
      if (userId) {
        existingVote = await PollVote.hasUserVoted(pollId, userId);
      } else if (anonymousToken) {
        const tokenHash = PollVote.hashAnonymousToken(anonymousToken);
        existingVote = await PollVote.hasAnonymousVoted(pollId, tokenHash);
      } else {
        throw new Error('Either userId or anonymousToken must be provided');
      }

      if (existingVote) {
        // Update existing vote
        existingVote.optionIds = optionIds;
        existingVote.ipAddress = ipAddress;
        existingVote.userAgent = userAgent;
        await existingVote.save();
        return existingVote;
      } else {
        // Create new vote
        const voteData = {
          poll: pollId,
          optionIds: optionIds,
          ipAddress: ipAddress,
          userAgent: userAgent
        };

        if (userId) {
          voteData.user = userId;
          voteData.isAnonymous = false;
        } else {
          voteData.isAnonymous = true;
          voteData.anonymousTokenHash = PollVote.hashAnonymousToken(anonymousToken);
        }

        const vote = new PollVote(voteData);
        await vote.save();
        return vote;
      }
    } catch (error) {
      throw new Error(`Failed to vote: ${error.message}`);
    }
  }

  // Get poll results (legacy method)
  async getPollResults(pollId) {
    try {
      const poll = await this.getPoll(pollId);
      
      // Get vote counts per option
      const voteCounts = await PollVote.getVoteCounts(pollId);
      
      // Get overall statistics
      const stats = await PollVote.getPollStatistics(pollId);
      const totalVotes = stats[0]?.totalVotes || 0;
      const anonymousVotes = stats[0]?.anonymousVotes || 0;
      const identifiedVotes = stats[0]?.identifiedVotes || 0;

      // Build results object
      const results = {};
      poll.options.forEach(option => {
        const voteCount = voteCounts.find(vc => vc._id === option.id)?.count || 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100 * 100) / 100 : 0;
        
        results[option.id] = {
          text: option.label,
          votes: voteCount,
          percentage: percentage
        };
      });

      return {
        pollId: poll._id,
        question: poll.question,
        totalVotes: totalVotes,
        anonymousVotes: anonymousVotes,
        identifiedVotes: identifiedVotes,
        results: results,
        pollType: poll.pollType,
        maxVotes: poll.maxVotes,
        status: poll.status,
        closesAt: poll.closesAt
      };
    } catch (error) {
      throw new Error(`Failed to get poll results: ${error.message}`);
    }
  }

  // Get user's vote on a poll (legacy method)
  async getUserVoteLegacy(pollId, userId = null, anonymousToken = null) {
    try {
      let vote = null;
      
      if (userId) {
        vote = await PollVote.hasUserVoted(pollId, userId);
      } else if (anonymousToken) {
        const tokenHash = PollVote.hashAnonymousToken(anonymousToken);
        vote = await PollVote.hasAnonymousVoted(pollId, tokenHash);
      }

      return vote;
    } catch (error) {
      throw new Error(`Failed to get user vote: ${error.message}`);
    }
  }

  // Close poll early
  async closePollEarly(pollId, organizerId) {
    try {
      const poll = await Poll.findOne({
        _id: pollId,
        organizer: organizerId,
        deletedAt: null
      });

      if (!poll) {
        throw new Error('Poll not found or access denied');
      }

      if (poll.status === 'closed') {
        throw new Error('Poll is already closed');
      }

      await poll.closeEarly();
      return poll;
    } catch (error) {
      throw new Error(`Failed to close poll: ${error.message}`);
    }
  }

  // Delete poll (soft delete)
  async deletePoll(pollId, organizerId) {
    try {
      const poll = await Poll.findOne({
        _id: pollId,
        organizer: organizerId,
        deletedAt: null
      });

      if (!poll) {
        throw new Error('Poll not found or access denied');
      }

      await poll.softDelete();
      return poll;
    } catch (error) {
      throw new Error(`Failed to delete poll: ${error.message}`);
    }
  }

  // Generate anonymous token
  generateAnonymousToken() {
    return PollVote.generateAnonymousToken();
  }

  // Validate poll data
  validatePollData(pollData) {
    if (!pollData.question || pollData.question.trim().length === 0) {
      throw new Error('Poll question is required');
    }

    if (pollData.question.length > 500) {
      throw new Error('Poll question must be 500 characters or less');
    }

    if (!pollData.options || !Array.isArray(pollData.options)) {
      throw new Error('Poll options are required');
    }

    this.validateOptions(pollData.options);

    if (pollData.closesAt) {
      const closesAt = new Date(pollData.closesAt);
      if (closesAt <= new Date()) {
        throw new Error('Poll must close in the future');
      }
    }

    if (pollData.pollType === 'multiple_choice') {
      const maxVotes = pollData.maxVotes || 1;
      if (maxVotes > pollData.options.length) {
        throw new Error('maxVotes cannot exceed number of options');
      }
    }
  }

  // Validate options
  validateOptions(options) {
    if (options.length < 2 || options.length > 10) {
      throw new Error('Poll must have between 2 and 10 options');
    }

    const optionIds = new Set();
    options.forEach((option, index) => {
      if (!option.label || option.label.trim().length === 0) {
        throw new Error(`Option ${index + 1} label is required`);
      }

      if (option.label.length > 200) {
        throw new Error(`Option ${index + 1} label must be 200 characters or less`);
      }

      const optionId = option.id || `opt_${index + 1}`;
      if (optionIds.has(optionId)) {
        throw new Error(`Duplicate option ID: ${optionId}`);
      }
      optionIds.add(optionId);
    });
  }

  // Validate vote options
  validateVoteOptions(poll, optionIds) {
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      throw new Error('At least one option must be selected');
    }

    if (poll.pollType === 'single_choice' && optionIds.length > 1) {
      throw new Error('Only one option can be selected for single choice polls');
    }

    if (optionIds.length > poll.maxVotes) {
      throw new Error(`Maximum ${poll.maxVotes} options can be selected`);
    }

    const validOptionIds = poll.options.map(opt => opt.id);
    optionIds.forEach(optionId => {
      if (!validOptionIds.includes(optionId)) {
        throw new Error(`Invalid option ID: ${optionId}`);
      }
    });
  }

  // Auto-close expired polls (called by scheduler)
  async autoCloseExpiredPolls() {
    try {
      const expiredPolls = await Poll.find({
        status: 'active',
        closesAt: { $lte: new Date() },
        deletedAt: null
      });

      const results = [];
      for (const poll of expiredPolls) {
        await poll.closeEarly();
        results.push(poll._id);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to auto-close polls: ${error.message}`);
    }
  }
}

module.exports = new PollService();
