import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VoteInterface from './VoteInterface';
import ResultsVisualization from './ResultsVisualization';

const PollCard = ({ poll, isNew }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showVoting, setShowVoting] = useState(!poll?.has_voted && poll?.status !== 'closed');

  const pollOptions = useMemo(() => poll?.options_json || poll?.options || [], [poll]);

  useEffect(() => {
    const updateTime = () => {
      try {
        const closesAt = poll?.closes_at ? new Date(poll.closes_at) : null;
        if (!closesAt || Number.isNaN(closesAt.getTime())) {
          setTimeRemaining('');
          return;
        }
        setTimeRemaining(formatDistanceToNow(closesAt, { addSuffix: true }));
      } catch {
        setTimeRemaining('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [poll?.closes_at]);

  const getPollTypeIcon = (type) => {
    switch (type) {
      case 'artist_selection': return '🎤';
      case 'theme_selection': return '🎨';
      case 'feature_selection': return '⚡';
      default: return '📊';
    }
  };

  const getPollTypeLabel = (type) => {
    switch (type) {
      case 'artist_selection': return 'Artist Selection';
      case 'theme_selection': return 'Theme Selection';
      case 'feature_selection': return 'Feature Selection';
      default: return 'General Poll';
    }
  };

  if (!poll) return null;

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md ${
        isNew ? 'ring-2 ring-purple-600 ring-offset-2' : ''
      } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getPollTypeIcon(poll.poll_type)}</span>
            <div>
              <p className="text-xs opacity-90">{getPollTypeLabel(poll.poll_type)}</p>
              <h4 className="font-semibold text-lg leading-snug">{poll.question}</h4>
            </div>
          </div>
          {isNew && (
            <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">NEW</span>
          )}
        </div>
        {poll.description && (
          <p className="text-sm opacity-90 mt-2">{poll.description}</p>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {showVoting && !poll.has_voted && poll.status !== 'closed' && pollOptions.length > 0 ? (
          <VoteInterface poll={poll} onVoteSuccess={() => setShowVoting(false)} />
        ) : (
          <ResultsVisualization poll={poll} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{poll.status === 'closed' ? 'Closed' : `Closes ${timeRemaining}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{poll.total_votes || 0} votes</span>
          </div>
        </div>

        {poll.has_voted && poll.allow_vote_changes && poll.status === 'active' && (
          <button
            onClick={() => setShowVoting(true)}
            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
          >
            Change Vote
          </button>
        )}
      </div>
    </div>
  );
};

export default PollCard;
