import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPoll } from '../../store/slices/pollsSlice';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';

const POLL_TYPES = [
  { value: 'general', label: 'General Poll', icon: '📊' },
  { value: 'artist_selection', label: 'Artist Selection', icon: '🎤' },
  { value: 'theme_selection', label: 'Theme Selection', icon: '🎨' },
  { value: 'feature_selection', label: 'Feature Selection', icon: '⚡' }
];

const SimplePollCreator = ({ eventId, onClose, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const { isCreatingPoll, errors } = useSelector(state => state.polls);
  const { user } = useSelector(state => state.auth);

  // Form state
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    poll_type: 'general',
    options: [
      { label: '', description: '' },
      { label: '', description: '' }
    ],
    max_votes: 1,
    allow_vote_changes: true,
    allow_anonymous: false,
    closes_at: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function
  const validateForm = () => {
    const errors = {};

    // Question validation
    if (!formData.question.trim()) {
      errors.question = 'Question is required';
    } else if (formData.question.trim().length < 10) {
      errors.question = 'Question must be at least 10 characters';
    } else if (formData.question.length > 300) {
      errors.question = 'Question cannot exceed 300 characters';
    }

    // Options validation
    const validOptions = formData.options.filter(opt => opt.label.trim() !== '');
    if (validOptions.length < 2) {
      errors.options = 'At least 2 options are required';
    }
    if (validOptions.length > 10) {
      errors.options = 'Maximum 10 options allowed';
    }

    // Check for duplicate option labels
    const optionLabels = validOptions.map(opt => opt.label.toLowerCase().trim());
    const duplicates = optionLabels.filter((label, index) => optionLabels.indexOf(label) !== index);
    if (duplicates.length > 0) {
      errors.options = 'Duplicate option labels are not allowed';
    }

    // Artist selection validation
    if (formData.poll_type === 'artist_selection') {
      const missingArtistNames = validOptions.some(opt => !opt.artist_name?.trim());
      if (missingArtistNames) {
        errors.options = 'Artist name is required for all options in artist selection poll';
      }
    }

    // Closing date validation
    if (!formData.closes_at) {
      errors.closes_at = 'Poll end date is required';
    } else {
      const closingDate = new Date(formData.closes_at);
      const now = new Date();
      if (closingDate <= now) {
        errors.closes_at = 'Poll must close in the future';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Handle option changes
  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));

    // Clear options validation error
    if (validationErrors.options) {
      setValidationErrors(prev => ({
        ...prev,
        options: null
      }));
    }
  };

  // Add new option
  const addOption = () => {
    if (formData.options.length >= 10) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { label: '', description: '' }]
    }));
  };

  // Remove option
  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Clean up options (remove empty ones)
      const cleanedOptions = formData.options
        .filter(opt => opt.label.trim() !== '')
        .map((opt, index) => ({
          id: `opt_${Date.now()}_${index}`,
          label: opt.label.trim(),
          description: opt.description?.trim() || '',
          ...(opt.artist_name && { artist_name: opt.artist_name.trim() }),
          ...(opt.artist_genre && { artist_genre: opt.artist_genre.trim() }),
          ...(opt.image_url && { image_url: opt.image_url.trim() })
        }));

      const pollData = {
        question: formData.question.trim(),
        description: formData.description.trim(),
        poll_type: formData.poll_type,
        options: cleanedOptions,
        max_votes: formData.max_votes,
        allow_vote_changes: formData.allow_vote_changes,
        allow_anonymous: formData.allow_anonymous,
        closes_at: formData.closes_at
      };

      console.log('Submitting poll data:', pollData);

      const result = await dispatch(createPoll({ 
        eventId, 
        pollData 
      })).unwrap();

      console.log('Poll created successfully:', result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Failed to create poll:', error);
      // Error is already handled by Redux
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: isDarkMode ? 'var(--bg-card)' : 'var(--bg-card)',
          color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 
            className="text-2xl font-bold"
            style={{ color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)' }}
          >
            Create New Poll
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Poll Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Poll Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {POLL_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleFieldChange('poll_type', type.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.poll_type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => handleFieldChange('question', e.target.value)}
              placeholder="e.g., What is your favorite music genre?"
              rows={3}
              maxLength={300}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.question ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              {validationErrors.question && (
                <span className="text-sm text-red-600">{validationErrors.question}</span>
              )}
              <span className="text-sm text-gray-500">
                {formData.question.length}/300
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Provide additional context for voters..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Options <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                disabled={formData.options.length >= 10}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            </div>

            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <OptionInput
                  key={index}
                  index={index}
                  option={option}
                  pollType={formData.poll_type}
                  onChange={handleOptionChange}
                  onRemove={removeOption}
                  canRemove={formData.options.length > 2}
                />
              ))}
            </div>

            {validationErrors.options && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.options}
              </p>
            )}
          </div>

          {/* Voting Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Votes per Person
              </label>
              <select
                value={formData.max_votes}
                onChange={(e) => handleFieldChange('max_votes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Closes At <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.closes_at}
                onChange={(e) => handleFieldChange('closes_at', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.closes_at ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.closes_at && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.closes_at}</p>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Allow Vote Changes</p>
                <p className="text-sm text-gray-600">Attendees can change their vote before poll closes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_vote_changes}
                  onChange={(e) => handleFieldChange('allow_vote_changes', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Anonymous Voting</p>
                <p className="text-sm text-gray-600">Hide voter identities in results</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_anonymous}
                  onChange={(e) => handleFieldChange('allow_anonymous', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {errors.polls && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Failed to create poll</h3>
                <p className="text-sm text-red-700 mt-1">{errors.polls}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCreatingPoll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting || isCreatingPoll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Poll
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Option Input Component
const OptionInput = ({ index, option, pollType, onChange, onRemove, canRemove }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-gray-700">Option {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={option.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
          placeholder={
            pollType === 'artist_selection' ? 'Artist name (e.g., Drake)' :
            pollType === 'theme_selection' ? 'Theme name (e.g., Neon Nights)' :
            pollType === 'feature_selection' ? 'Feature name (e.g., VIP Lounge)' :
            'Option label'
          }
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {pollType === 'artist_selection' && (
          <>
            <input
              type="text"
              value={option.artist_name || ''}
              onChange={(e) => onChange(index, 'artist_name', e.target.value)}
              placeholder="Full artist name (required)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              value={option.artist_genre || ''}
              onChange={(e) => onChange(index, 'artist_genre', e.target.value)}
              placeholder="Genre (e.g., Hip-hop, Electronic)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </>
        )}

        <textarea
          value={option.description || ''}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          placeholder="Brief description (optional)"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

export default SimplePollCreator;
