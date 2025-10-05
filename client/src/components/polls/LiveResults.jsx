import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResults } from '../../store/slices/pollsSlice';
import ResultsDisplay from './ResultsDisplay';
import VoteForm from './VoteForm';
import { TrendingUp, Users, RefreshCw, Edit3 } from 'lucide-react';

const LiveResults = ({ poll, results, userVote, onVote }) => {
  const dispatch = useDispatch();
  const { isFetchingResults } = useSelector(state => state.polls);
  const [showVoteForm, setShowVoteForm] = useState(false);

  const handleRefreshResults = () => {
    dispatch(fetchResults({ pollId: poll.poll_id }));
  };

  const handleVoteChange = (optionIds) => {
    onVote(optionIds);
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

  return (
    <div className="space-y-4">
      {/* Live Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-gray-900">Live Results</h3>
            <span className="text-sm text-gray-600">
              Closes in {getTimeRemaining()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {poll.allow_vote_changes && (
              <button
                onClick={() => setShowVoteForm(true)}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Change Vote
              </button>
            )}
            
            <button
              onClick={handleRefreshResults}
              disabled={isFetchingResults}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingResults ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Results or Vote Form */}
      {showVoteForm ? (
        <VoteForm
          poll={poll}
          onVote={handleVoteChange}
          onCancel={() => setShowVoteForm(false)}
          isVoting={false}
        />
      ) : (
        <ResultsDisplay poll={poll} results={results} userVote={userVote} />
      )}

      {/* Live Updates Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <TrendingUp className="w-4 h-4" />
          <span>
            Results update in real-time as people vote. 
            {poll.allow_vote_changes && ' You can change your vote anytime before the poll closes.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveResults;
