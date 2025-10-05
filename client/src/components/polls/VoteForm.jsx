import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

const VoteForm = ({ poll, onVote, onCancel, isVoting, error }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Reset selection when poll changes
    setSelectedOptions([]);
    setValidationError('');
  }, [poll.poll_id]);

  const handleOptionToggle = (optionId) => {
    setSelectedOptions(prev => {
      const isSelected = prev.includes(optionId);
      
      if (isSelected) {
        // Remove option
        return prev.filter(id => id !== optionId);
      } else {
        // Add option (check max votes limit)
        if (prev.length >= poll.max_votes) {
          setValidationError(`You can only select ${poll.max_votes} option${poll.max_votes > 1 ? 's' : ''}`);
          return prev;
        }
        setValidationError('');
        return [...prev, optionId];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedOptions.length === 0) {
      setValidationError('Please select at least one option');
      return;
    }

    if (selectedOptions.length > poll.max_votes) {
      setValidationError(`You can only select ${poll.max_votes} option${poll.max_votes > 1 ? 's' : ''}`);
      return;
    }

    onVote(selectedOptions);
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Poll Question */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {poll.question}
        </h3>
        {poll.description && (
          <p className="text-gray-600 text-sm">{poll.description}</p>
        )}
        
        <div className="mt-3 text-sm text-gray-500">
          Select {poll.max_votes > 1 ? `up to ${poll.max_votes} options` : 'one option'}
          {selectedOptions.length > 0 && (
            <span className="ml-2 text-blue-600">
              ({selectedOptions.length}/{poll.max_votes})
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {poll.options_json.map((option, index) => {
          const isSelected = selectedOptions.includes(option.id);
          
          return (
            <label
              key={option.id}
              className={`block cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
                {/* Selection Indicator */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Option Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getOptionIcon(option) && (
                      <span className="text-lg">{getOptionIcon(option)}</span>
                    )}
                    <span className={`font-medium ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  
                  {option.description && (
                    <p className={`text-sm ${
                      isSelected ? 'text-blue-700' : 'text-gray-600'
                    }`}>
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

                {/* Selection Number */}
                {isSelected && (
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {selectedOptions.indexOf(option.id) + 1}
                  </div>
                )}
              </div>
              
              <input
                type={poll.max_votes > 1 ? "checkbox" : "radio"}
                name="poll_option"
                value={option.id}
                checked={isSelected}
                onChange={() => handleOptionToggle(option.id)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>

      {/* Validation Error */}
      {(validationError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {validationError || error}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={isVoting || selectedOptions.length === 0}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isVoting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Submit Vote
            </>
          )}
        </button>
      </div>

      {/* Poll Settings Info */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
        {poll.allow_anonymous && (
          <span className="inline-block mr-4">🔒 Anonymous voting enabled</span>
        )}
        {poll.allow_vote_changes && (
          <span className="inline-block">✏️ Vote changes allowed</span>
        )}
      </div>
    </form>
  );
};

export default VoteForm;
