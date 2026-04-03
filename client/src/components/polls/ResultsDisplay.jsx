import React from 'react';
import { TrendingUp, Users, Eye, Download, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { getPollOptionImageUrl, resolveMediaUrl } from '../../utils/resolveMediaUrl';

const ResultsDisplay = ({ poll, results, userVote, isLoading, isOrganizerView = false }) => {
  const { isDarkMode } = useTheme();
  const opts = poll.options_json || poll.options || [];

  if (isLoading || (!results && poll.status === 'closed')) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2
          className={cn('mb-4 h-10 w-10 animate-spin', isDarkMode ? 'text-[#8A4FFF]' : 'text-[#4f0f69]')}
        />
        <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
          Loading final results…
        </p>
      </div>
    );
  }

  if (!results || !results.results) {
    return (
      <div className="py-8 text-center">
        <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
          Results are not available yet.
        </p>
      </div>
    );
  }

  const getOptionIcon = () => {
    switch (poll.poll_type) {
      case 'artist_selection':
        return '🎵';
      case 'theme_selection':
        return '🎨';
      case 'feature_selection':
        return '⭐';
      default:
        return null;
    }
  };

  const icon = getOptionIcon();

  const getTotalVotes = () => {
    return results.analytics?.total_votes ?? results.total_votes ?? 0;
  };

  const getParticipationRate = () => {
    const p = results.analytics?.participation_rate;
    return typeof p === 'number' && !Number.isNaN(p) ? p : 0;
  };

  const getResultsForOption = (optionId) => {
    const result = results.results[optionId];
    return result || { votes: 0, percentage: 0 };
  };

  const sortedOptions = opts
    .map((option) => ({
      ...option,
      ...getResultsForOption(option.id)
    }))
    .sort((a, b) => b.votes - a.votes);

  const isUserVote = (optionId) => userVote && userVote.includes(optionId);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3
          className={cn(
            'mb-2 text-lg font-semibold',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}
        >
          {poll.status === 'closed'
            ? 'Final results'
            : isOrganizerView
              ? 'Current tally'
              : 'Results'}
        </h3>

        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-6 text-sm',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{getTotalVotes()} votes</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{getParticipationRate()}% participation</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sortedOptions.map((option, index) => {
          const isUserSelected = isUserVote(option.id);
          const isWinner = index === 0 && option.votes > 0;
          const pct = Number(option.percentage) || 0;
          const optionImage = getPollOptionImageUrl(option);

          return (
            <div
              key={option.id}
              className={cn(
                'relative overflow-hidden rounded-2xl border backdrop-blur-md transition-shadow',
                isDarkMode
                  ? 'border-white/10 bg-white/[0.06]'
                  : 'border-gray-200/80 bg-white/80 shadow-md',
                isWinner && (isDarkMode ? 'ring-1 ring-amber-400/40' : 'ring-2 ring-amber-200'),
                isUserSelected && !isWinner && (isDarkMode ? 'ring-1 ring-[#8A4FFF]/40' : 'ring-2 ring-indigo-200')
              )}
            >
              {isWinner && (
                <div className="absolute right-2 top-2 z-10 rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-md">
                  Leading
                </div>
              )}
              {isUserSelected && !isWinner && (
                <div className="absolute right-2 top-2 z-10 rounded-lg bg-[#4f0f69] px-2 py-0.5 text-xs font-medium text-white shadow-md">
                  Your vote
                </div>
              )}

              {optionImage && (
                <div className="border-b border-black/5 dark:border-white/10">
                  <img
                    src={resolveMediaUrl(optionImage)}
                    alt={option.label}
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-start gap-3 p-4">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    index === 0 && option.votes > 0
                      ? 'bg-amber-500 text-white'
                      : isDarkMode
                        ? 'bg-white/10 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {icon && <span className="text-lg">{icon}</span>}
                    <span className={cn('font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}>
                      {option.label}
                    </span>
                  </div>
                  {option.description && (
                    <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                      {option.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                    {option.votes}
                  </div>
                  <div className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className={cn('h-2 w-full overflow-hidden rounded-full', isDarkMode ? 'bg-white/10' : 'bg-gray-200')}>
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      isWinner
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                        : isUserSelected
                          ? 'bg-gradient-to-r from-[#4f0f69] to-[#8A4FFF]'
                          : isDarkMode
                            ? 'bg-gray-500'
                            : 'bg-gray-400'
                    )}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {results.analytics && (
        <div
          className={cn(
            'rounded-xl border p-4',
            isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-gray-50/80'
          )}
        >
          <h4
            className={cn(
              'mb-3 flex items-center gap-2 font-medium',
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            )}
          >
            <Eye className="h-4 w-4" />
            Summary
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {[
              ['Total votes', results.analytics.total_votes],
              ['Participation', `${getParticipationRate()}%`],
              ['Identified', results.analytics.identified_votes ?? 0],
              ['Anonymous', results.analytics.anonymous_votes ?? 0]
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <div className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                  {val}
                </div>
                <div className={cn(isDarkMode ? 'text-gray-500' : 'text-gray-600')}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors',
            isDarkMode
              ? 'border-white/15 text-gray-300 hover:bg-white/10'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
        >
          <Download className="h-4 w-4" />
          Export results
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;
