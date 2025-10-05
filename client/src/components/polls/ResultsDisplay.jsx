import React from 'react';
import { TrendingUp, Users, Eye, Download } from 'lucide-react';

const ResultsDisplay = ({ poll, results, userVote }) => {
  if (!results) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">Results are being calculated...</p>
      </div>
    );
  }

  const getOptionIcon = (option) => {
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

  const getTotalVotes = () => {
    return results.analytics?.total_votes || 0;
  };

  const getParticipationRate = () => {
    return results.analytics?.participation_rate || 0;
  };

  const getResultsForOption = (optionId) => {
    const result = results.results[optionId];
    return result || { votes: 0, percentage: 0 };
  };

  const sortedOptions = poll.options_json
    .map(option => ({
      ...option,
      ...getResultsForOption(option.id)
    }))
    .sort((a, b) => b.votes - a.votes);

  const isUserVote = (optionId) => {
    return userVote && userVote.includes(optionId);
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {poll.status === 'closed' ? 'Final Results' : 'Live Results'}
        </h3>
        
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{getTotalVotes()} votes</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{getParticipationRate()}% participation</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {sortedOptions.map((option, index) => {
          const isUserSelected = isUserVote(option.id);
          const isWinner = index === 0 && option.votes > 0;
          
          return (
            <div
              key={option.id}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                isWinner 
                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' 
                  : isUserSelected
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Winner Badge */}
              {isWinner && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  🏆 Winner
                </div>
              )}

              {/* User Vote Badge */}
              {isUserSelected && !isWinner && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Your Vote
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 && option.votes > 0
                    ? 'bg-yellow-500 text-white'
                    : index === 1 && option.votes > 0
                    ? 'bg-gray-400 text-white'
                    : index === 2 && option.votes > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>

                {/* Option Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getOptionIcon(option) && (
                      <span className="text-lg">{getOptionIcon(option)}</span>
                    )}
                    <span className="font-medium text-gray-900">
                      {option.label}
                    </span>
                  </div>
                  
                  {option.description && (
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  )}

                  {/* Special fields for different poll types */}
                  {option.artist_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Artist: {option.artist_name}
                    </p>
                  )}
                  
                  {option.artist_genre && (
                    <p className="text-xs text-gray-500">
                      Genre: {option.artist_genre}
                    </p>
                  )}
                  
                  {option.feature_cost && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cost: ${option.feature_cost}
                    </p>
                  )}
                </div>

                {/* Vote Count and Percentage */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {option.votes}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isWinner
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                        : isUserSelected
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Summary */}
      {results.analytics && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Analytics Summary
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {results.analytics.total_votes}
              </div>
              <div className="text-gray-600">Total Votes</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {results.analytics.participation_rate}%
              </div>
              <div className="text-gray-600">Participation</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {results.analytics.identified_votes || 0}
              </div>
              <div className="text-gray-600">Identified</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {results.analytics.anonymous_votes || 0}
              </div>
              <div className="text-gray-600">Anonymous</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Button (for organizers) */}
      <div className="text-center">
        <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          Export Results
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;
