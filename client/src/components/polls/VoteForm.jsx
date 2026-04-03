import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { getPollOptionImageUrl, resolveMediaUrl } from '../../utils/resolveMediaUrl';

const VoteForm = ({ poll, onVote, onCancel, isVoting, error }) => {
  const { isDarkMode } = useTheme();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [validationError, setValidationError] = useState('');
  const options = poll.options_json || poll.options || [];

  useEffect(() => {
    setSelectedOptions([]);
    setValidationError('');
  }, [poll.poll_id]);

  const handleOptionToggle = (optionId) => {
    setSelectedOptions((prev) => {
      if (poll.max_votes <= 1) {
        setValidationError('');
        return prev.includes(optionId) ? [] : [optionId];
      }
      const isSelected = prev.includes(optionId);
      if (isSelected) {
        return prev.filter((id) => id !== optionId);
      }
      if (prev.length >= poll.max_votes) {
        setValidationError(
          `You can only select ${poll.max_votes} option${poll.max_votes > 1 ? 's' : ''}`
        );
        return prev;
      }
      setValidationError('');
      return [...prev, optionId];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedOptions.length === 0) {
      setValidationError('Please select at least one option');
      return;
    }
    if (selectedOptions.length > poll.max_votes) {
      setValidationError(
        `You can only select ${poll.max_votes} option${poll.max_votes > 1 ? 's' : ''}`
      );
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
        return '✦';
    }
  };

  const cardBase = cn(
    'group relative cursor-pointer rounded-xl border p-4 md:p-5 transition-all duration-200',
    'hover:-translate-y-0.5 hover:shadow-md',
    isDarkMode
      ? 'border-white/10 bg-white/[0.06] backdrop-blur-sm hover:border-white/18 hover:bg-white/[0.09]'
      : 'border-gray-200/80 bg-white/90 shadow-sm hover:border-gray-300 hover:bg-white hover:shadow-md'
  );

  const cardSelected = cn(
    'ring-2 ring-offset-1 scale-[1.01]',
    isDarkMode
      ? 'ring-violet-500/70 ring-offset-gray-900/0 border-violet-500/40 bg-white/[0.1]'
      : 'ring-[#4f0f69]/50 ring-offset-white border-[#4f0f69]/35 bg-violet-50/80'
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div
          className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
            isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#8A4FFF]" />
          Cast your vote
        </div>
        <h3
          className={cn(
            'text-lg font-semibold md:text-xl',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}
        >
          {poll.question}
        </h3>
        {poll.description && (
          <p className={cn('mt-2 text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {poll.description}
          </p>
        )}
        <p className={cn('mt-3 text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
          Select {poll.max_votes > 1 ? `up to ${poll.max_votes} options` : 'one option'}
          {selectedOptions.length > 0 && (
            <span className={cn('ml-2 font-medium', isDarkMode ? 'text-[#b388ff]' : 'text-[#4f0f69]')}>
              ({selectedOptions.length}/{poll.max_votes})
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const optionImage = getPollOptionImageUrl(option);
          return (
            <label
              key={option.id}
              className={cn(cardBase, isSelected && cardSelected)}
            >
              <input
                type={poll.max_votes > 1 ? 'checkbox' : 'radio'}
                name="poll_option"
                value={option.id}
                checked={isSelected}
                onChange={() => handleOptionToggle(option.id)}
                className="sr-only"
              />
              <div className="flex flex-col gap-3">
                {optionImage && (
                  <div className="-mx-1 -mt-1 overflow-hidden rounded-lg border border-black/5 dark:border-white/10">
                    <img
                      src={resolveMediaUrl(optionImage)}
                      alt={option.label}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl drop-shadow-sm">{getOptionIcon(option)}</span>
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isSelected
                        ? isDarkMode
                          ? 'border-[#8A4FFF] bg-[#8A4FFF] text-white'
                          : 'border-[#4f0f69] bg-[#4f0f69] text-white'
                        : isDarkMode
                          ? 'border-white/25 bg-white/5 group-hover:border-white/40'
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
                  </div>
                </div>
                <div>
                  <span
                    className={cn(
                      'font-semibold leading-snug',
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <p
                      className={cn(
                        'mt-1.5 text-sm leading-relaxed',
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      )}
                    >
                      {option.description}
                    </p>
                  )}
                  {option.artist_name && (
                    <p className={cn('mt-1 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                      Artist: {option.artist_name}
                    </p>
                  )}
                  {option.artist_genre && (
                    <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                      {option.artist_genre}
                    </p>
                  )}
                </div>
                {isSelected && poll.max_votes > 1 && (
                  <span
                    className={cn(
                      'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      isDarkMode ? 'bg-[#8A4FFF]/30 text-violet-100' : 'bg-indigo-100 text-indigo-800'
                    )}
                  >
                    #{selectedOptions.indexOf(option.id) + 1}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {(validationError || error) && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4',
            isDarkMode
              ? 'border-red-500/30 bg-red-950/40 text-red-200'
              : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{validationError || error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-medium transition-colors',
            isDarkMode
              ? 'border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
              : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
          )}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isVoting || selectedOptions.length === 0}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-45',
            'bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] shadow-lg shadow-[#4f0f69]/25 hover:opacity-95 hover:shadow-[#4f0f69]/35'
          )}
        >
          {isVoting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Submit vote
            </>
          )}
        </button>
      </div>

      <div
        className={cn(
          'border-t pt-3 text-center text-xs',
          isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-500'
        )}
      >
        {poll.allow_anonymous && <span className="mr-4">Anonymous voting</span>}
        {poll.allow_vote_changes && <span>You can change your vote before the poll closes</span>}
      </div>
    </form>
  );
};

export default VoteForm;
