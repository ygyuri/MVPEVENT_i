import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Award } from 'lucide-react';
import { fetchResults } from '../../store/slices/pollsSlice';

const ResultsVisualization = ({ poll }) => {
  const dispatch = useDispatch();
  const { pollResults, isFetchingResults } = useSelector(state => state.polls);
  const results = pollResults[poll.poll_id];
  const isLoading = isFetchingResults[poll.poll_id] || !results;

  useEffect(() => {
    if (!results) {
      dispatch(fetchResults({ pollId: poll.poll_id }));
    }
  }, [dispatch, poll.poll_id, results]);

  const sortedOptions = useMemo(() => {
    const entries = Object.entries(results?.results || {});
    return entries.sort(([, a], [, b]) => (b.vote_count || 0) - (a.vote_count || 0));
  }, [results]);

  const maxVotes = useMemo(() => {
    const counts = sortedOptions.map(([, opt]) => opt.vote_count || 0);
    return Math.max(...counts, 1);
  }, [sortedOptions]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-b-2 border-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <div className="text-center">
          <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{results?.analytics?.total_votes || 0}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Total Votes</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(results?.analytics?.participation_rate || 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Participation</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{sortedOptions.length}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Options</p>
        </div>
      </div>

      {/* Results Bars */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedOptions.map(([optionId, optionData], index) => (
            <ResultBar
              key={optionId}
              option={optionData}
              isWinning={index === 0}
              maxVotes={maxVotes}
              isUserVote={Array.isArray(poll.user_vote) && poll.user_vote.includes(optionId)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ResultBar = ({ option, isWinning, maxVotes, isUserVote }) => {
  const percentage = maxVotes > 0 ? ((option.vote_count || 0) / maxVotes) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative overflow-hidden rounded-lg ${isUserVote ? 'ring-2 ring-purple-600 ring-offset-2' : ''}`}
    >
      <div className="relative bg-gray-100 dark:bg-gray-800 h-16 rounded-lg overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 ${
            isWinning
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
              : 'bg-gradient-to-r from-purple-400 to-indigo-400'
          }`}
        />
        <div className="relative h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isWinning && <span className="text-yellow-400">👑</span>}
            <span className="font-semibold text-gray-900 dark:text-white">{option.label}</span>
            {isUserVote && (
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">Your vote</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-gray-900 dark:text-white">{(option.percentage || 0).toFixed(1)}%</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{option.vote_count || 0} vote{(option.vote_count || 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsVisualization;
