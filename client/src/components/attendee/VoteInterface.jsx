import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle } from 'lucide-react';
import { submitVote, fetchResults } from '../../store/slices/pollsSlice';

const VoteInterface = ({ poll, onVoteSuccess }) => {
  const dispatch = useDispatch();
  const { isVoting } = useSelector(state => state.polls);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [error, setError] = useState('');

  const isSingleChoice = poll?.max_votes === 1;
  const pollOptions = useMemo(() => poll?.options_json || poll?.options || [], [poll]);

  const handleOptionToggle = (optionId) => {
    if (isSingleChoice) {
      setSelectedOptions([optionId]);
      setError('');
      return;
    }

    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      }
      if (prev.length >= (poll?.max_votes || 1)) {
        setError(`Maximum ${poll?.max_votes} selections allowed`);
        return prev;
      }
      setError('');
      return [...prev, optionId];
    });
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      setError('Please select at least one option');
      return;
    }
    try {
      await dispatch(submitVote({ pollId: poll.poll_id, optionIds: selectedOptions })).unwrap();
      dispatch(fetchResults({ pollId: poll.poll_id }));
      onVoteSuccess?.();
    } catch (err) {
      setError(err?.message || 'Failed to submit vote');
    }
  };

  return (
    <div className="space-y-4">
      {!isSingleChoice && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Select up to {poll.max_votes} option{poll.max_votes > 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-2">
        {pollOptions.map((option) => (
          <VoteOption
            key={option.id}
            option={option}
            isSelected={selectedOptions.includes(option.id)}
            isSingleChoice={isSingleChoice}
            onClick={() => handleOptionToggle(option.id)}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={selectedOptions.length === 0 || isVoting[poll.poll_id]}
        className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isVoting[poll.poll_id] ? 'Submitting...' : 'Submit Vote'}
      </button>
    </div>
  );
};

const VoteOption = ({ option, isSelected, isSingleChoice, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 transition-all text-left bg-white dark:bg-gray-800 ${
        isSelected
          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/30 shadow'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {isSingleChoice ? (
            <div className={`w-5 h-5 rounded-full border-2 ${
              isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300 dark:border-gray-600'
            } flex items-center justify-center`}
            >
              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          ) : (
            <div className={`w-5 h-5 rounded border-2 ${
              isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300 dark:border-gray-600'
            } flex items-center justify-center`}
            >
              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
          )}
        </div>

        <div className="flex-1">
          {option.image_url && (
            <img src={option.image_url} alt={option.label} className="w-full h-32 object-cover rounded-lg mb-2" />
          )}
          <h5 className="font-semibold text-gray-900 dark:text-white">{option.label}</h5>
          {option.artist_genre && (
            <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">{option.artist_genre}</p>
          )}
          {option.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{option.description}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default VoteInterface;
