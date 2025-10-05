import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitVote, fetchResults, closePoll } from '../../store/slices/pollsSlice';
import { useTheme } from '../../contexts/ThemeContext';
import VoteForm from './VoteForm';
import ResultsDisplay from './ResultsDisplay';
import LiveResults from './LiveResults';
import { 
  Clock, 
  Users, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const PollCard = ({ poll, eventId, isOrganizer }) => {
  const { isDarkMode } = useTheme();
  
  // Add safety checks for poll data
  if (!poll) {
    console.error('[PollCard] No poll data provided');
    return <div className="p-4 text-red-500">Error: No poll data</div>;
  }

  // Handle both options_json and options fields for backward compatibility
  const pollOptions = poll.options_json || poll.options || [];
  if (pollOptions.length === 0) {
    console.warn('[PollCard] Poll has no options:', poll);
  }
  const dispatch = useDispatch();
  const { userVotes, pollResults, isVoting, errors } = useSelector(state => state.polls);
  const [showResults, setShowResults] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);

  const userVote = userVotes[poll.poll_id];
  const results = pollResults[poll.poll_id];
  const hasVoted = !!userVote;
  const isVotingInProgress = isVoting[poll.poll_id];

  useEffect(() => {
    // Join poll room for granular updates
    try {
      const { pollSocket } = require('../../services/websocket/PollSocketManager');
      pollSocket.joinPoll(poll.poll_id);
      return () => pollSocket.leavePoll(poll.poll_id);
    } catch (_) {}
    
    // Show results if user has voted or poll is closed
    if (hasVoted || poll.status === 'closed') {
      setShowResults(true);
    }
  }, [hasVoted, poll.status]);

  const handleVote = async (optionIds) => {
    try {
      await dispatch(submitVote({ pollId: poll.poll_id, optionIds })).unwrap();
      
      // Fetch results after voting
      dispatch(fetchResults({ pollId: poll.poll_id }));
      setShowResults(true);
      setShowVoteForm(false);
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  const handleClosePoll = async () => {
    if (window.confirm('Are you sure you want to close this poll? This action cannot be undone.')) {
      try {
        await dispatch(closePoll({ pollId: poll.poll_id })).unwrap();
      } catch (error) {
        console.error('Failed to close poll:', error);
      }
    }
  };

  const handleViewResults = () => {
    if (!results) {
      dispatch(fetchResults({ pollId: poll.poll_id }));
    }
    setShowResults(true);
    setShowVoteForm(false);
  };

  const getTimeRemaining = () => {
    const closesAt = new Date(poll.closes_at);
    const now = new Date();
    const diff = closesAt - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPollTypeLabel = (type) => {
    const types = {
      general: 'General Poll',
      artist_selection: 'Artist Selection',
      theme_selection: 'Theme Selection',
      feature_selection: 'Feature Selection'
    };
    return types[type] || 'General Poll';
  };

  const getStatusIcon = () => {
    switch (poll.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'closed':
        return <Lock className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (poll.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div 
      className="rounded-lg border shadow-sm hover:shadow-md transition-all duration-300"
      style={{
        background: isDarkMode ? 'var(--bg-card)' : 'var(--bg-card)',
        borderColor: isDarkMode ? 'var(--card-border)' : 'var(--card-border)',
        color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)'
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                {getStatusIcon()}
                {poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {getPollTypeLabel(poll.poll_type)}
              </span>
            </div>
            
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)' }}
            >
              {poll.question}
            </h3>
            
            {poll.description && (
              <p 
                className="text-sm mb-3"
                style={{ color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)' }}
              >
                {poll.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="flex items-center gap-2">
            {isOrganizer && poll.status === 'active' && (
              <button
                onClick={handleClosePoll}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close poll"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
            
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poll Info */}
        <div className="flex items-center gap-6 text-sm text-gray-500 mt-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {poll.status === 'active' ? `Closes in ${getTimeRemaining()}` : 'Closed'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>Max {poll.max_votes} vote{poll.max_votes > 1 ? 's' : ''}</span>
          </div>

          {poll.allow_anonymous && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Anonymous
            </span>
          )}

          {poll.allow_vote_changes && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Vote Changes
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {poll.status === 'closed' ? (
          /* Closed Poll - Show Results */
          <ResultsDisplay poll={poll} results={results} userVote={userVote} />
        ) : hasVoted ? (
          /* User Has Voted - Show Results or Live Results */
          showResults ? (
            poll.allow_vote_changes ? (
              <LiveResults poll={poll} results={results} userVote={userVote} onVote={handleVote} />
            ) : (
              <ResultsDisplay poll={poll} results={results} userVote={userVote} />
            )
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">You've already voted on this poll!</p>
              <button
                onClick={handleViewResults}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Results
              </button>
            </div>
          )
        ) : showVoteForm ? (
          /* Show Vote Form */
          <VoteForm
            poll={poll}
            onVote={handleVote}
            onCancel={() => setShowVoteForm(false)}
            isVoting={isVotingInProgress}
            error={errors.vote}
          />
        ) : (
          /* Show Options Preview */
          <div>
            <div className="space-y-2 mb-4">
              {pollOptions.map((option, index) => (
                <div
                  key={option.id || index}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)'
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <span style={{ color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                      {option.label}
                    </span>
                    {option.description && (
                      <p 
                        className="text-sm mt-1"
                        style={{ color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)' }}
                      >
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowVoteForm(true)}
              disabled={isVotingInProgress}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isVotingInProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Vote Now'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollCard;
