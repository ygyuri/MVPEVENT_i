import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPoll } from '../../store/slices/pollsSlice';
import { Plus, X, Clock, Users, Settings } from 'lucide-react';

const PollCreator = ({ eventId, onClose }) => {
  const dispatch = useDispatch();
  const { isCreatingPoll, errors } = useSelector(state => state.polls);
  const { user, isAuthenticated } = useSelector(state => state.auth);

  const [pollData, setPollData] = useState({
    question: '',
    description: '',
    poll_type: 'general',
    options: [{ label: '', description: '' }, { label: '', description: '' }],
    max_votes: 1,
    allow_anonymous: false,
    allow_vote_changes: true,
    closes_at: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  const pollTypes = [
    { value: 'general', label: 'General Poll' },
    { value: 'artist_selection', label: 'Artist Selection' },
    { value: 'theme_selection', label: 'Theme Selection' },
    { value: 'feature_selection', label: 'Feature Selection' }
  ];

  const validateForm = () => {
    const errors = {};

    if (!pollData.question.trim()) {
      errors.question = 'Question is required';
    } else if (pollData.question.length < 10) {
      errors.question = 'Question must be at least 10 characters';
    }

    if (!pollData.closes_at) {
      errors.closes_at = 'Closing date is required';
    } else {
      const closesAt = new Date(pollData.closes_at);
      const now = new Date();
      if (closesAt <= now) {
        errors.closes_at = 'Poll must close in the future';
      }
    }

    const validOptions = pollData.options.filter(opt => opt.label.trim());
    if (validOptions.length < 2) {
      errors.options = 'At least 2 options are required';
    }

    validOptions.forEach((option, index) => {
      if (!option.label.trim()) {
        errors[`option_${index}`] = 'Option text is required';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...pollData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setPollData({ ...pollData, options: newOptions });
    
    // Clear validation error for this option
    if (validationErrors[`option_${index}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`option_${index}`];
      setValidationErrors(newErrors);
    }
  };

  const addOption = () => {
    if (pollData.options.length < 10) {
      setPollData({
        ...pollData,
        options: [...pollData.options, { label: '', description: '' }]
      });
    }
  };

  const removeOption = (index) => {
    if (pollData.options.length > 2) {
      const newOptions = pollData.options.filter((_, i) => i !== index);
      setPollData({ ...pollData, options: newOptions });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setValidationErrors(prev => ({
        ...prev,
        auth: 'You must be logged in as the organizer to create a poll.'
      }));
      return;
    }

    if (!validateForm()) return;

    const validOptions = pollData.options
      .filter(opt => opt.label.trim())
      .map((opt, index) => ({
        id: `opt_${Date.now()}_${index}`,
        label: opt.label.trim(),
        description: opt.description.trim(),
        ...(pollData.poll_type === 'artist_selection' && {
          artist_name: opt.label.trim(),
          artist_genre: opt.description.trim()
        }),
        ...(pollData.poll_type === 'theme_selection' && {
          theme_color_hex: '#3B82F6'
        })
      }));

    try {
      await dispatch(createPoll({
        eventId,
        pollData: {
          ...pollData,
          options: validOptions
        }
      })).unwrap();
      
      onClose();
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  const isOrganizer = user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  if (!isOrganizer) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Poll</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Question *
              </label>
              <input
                type="text"
                value={pollData.question}
                onChange={(e) => setPollData({ ...pollData, question: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.question ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="What would you like to ask your audience?"
              />
              {validationErrors.question && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.question}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={pollData.description}
                onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional context or instructions..."
              />
            </div>

            {/* Poll Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Type
              </label>
              <select
                value={pollData.poll_type}
                onChange={(e) => setPollData({ ...pollData, poll_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pollTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              {pollData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`option_${index}`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={`Option ${index + 1}`}
                    />
                    {validationErrors[`option_${index}`] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[`option_${index}`]}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={option.description}
                      onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description (optional)"
                    />
                  </div>
                  {pollData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              {validationErrors.options && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.options}</p>
              )}
              
              {pollData.options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>

            {/* Poll Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Votes
                </label>
                <select
                  value={pollData.max_votes}
                  onChange={(e) => setPollData({ ...pollData, max_votes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Date *
                </label>
                <input
                  type="datetime-local"
                  value={pollData.closes_at}
                  onChange={(e) => setPollData({ ...pollData, closes_at: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.closes_at ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.closes_at && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.closes_at}</p>
                )}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pollData.allow_anonymous}
                  onChange={(e) => setPollData({ ...pollData, allow_anonymous: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Allow anonymous voting</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pollData.allow_vote_changes}
                  onChange={(e) => setPollData({ ...pollData, allow_vote_changes: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Allow vote changes</span>
              </label>
            </div>

            {/* Error Display */}
            {(validationErrors.auth || errors.polls) && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                {validationErrors.auth && (
                  <p className="text-sm text-red-600 mb-1">{validationErrors.auth}</p>
                )}
                {errors.polls && (
                  <p className="text-sm text-red-600">{errors.polls}</p>
                )}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingPoll}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreatingPoll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Poll
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PollCreator;
