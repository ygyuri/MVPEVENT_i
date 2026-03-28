import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPoll } from '../../store/slices/pollsSlice';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';

const POLL_TYPES = [
  { value: 'general', label: 'General Poll', icon: '📊' },
  { value: 'artist_selection', label: 'Artist Selection', icon: '🎤' },
  { value: 'theme_selection', label: 'Theme Selection', icon: '🎨' },
  { value: 'feature_selection', label: 'Feature Selection', icon: '⚡' }
];

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-100 placeholder:text-gray-500 focus:border-[#8A4FFF]/50 focus:outline-none focus:ring-2 focus:ring-[#8A4FFF]/40 focus:ring-offset-0';

const SimplePollCreator = ({ eventId, onClose, onSuccess }) => {
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
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poll-creator-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 id="poll-creator-title" className="text-2xl font-bold text-white">
            Create New Poll
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-200">Poll Type</label>
            <div className="grid grid-cols-2 gap-3">
              {POLL_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleFieldChange('poll_type', type.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    formData.poll_type === type.value
                      ? 'border-[#8A4FFF] bg-[#4f0f69]/20 text-gray-100'
                      : 'border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Question <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.question}
              onChange={e => handleFieldChange('question', e.target.value)}
              placeholder="e.g., What is your favorite music genre?"
              rows={3}
              maxLength={300}
              className={`${inputClass} ${validationErrors.question ? 'border-red-500' : ''}`}
            />
            <div className="mt-1 flex justify-between">
              {validationErrors.question && (
                <span className="text-sm text-red-400">{validationErrors.question}</span>
              )}
              <span className="text-sm text-gray-500">{formData.question.length}/300</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="Provide additional context for voters..."
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-200">
                Options <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                disabled={formData.options.length >= 10}
                className="flex items-center gap-1 px-3 py-1 text-sm text-[#8A4FFF] hover:text-[#b388ff] disabled:cursor-not-allowed disabled:text-gray-600"
              >
                <Plus className="h-4 w-4" />
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
              <p className="mt-2 flex items-center gap-1 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {validationErrors.options}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Maximum votes per person
              </label>
              <select
                value={formData.max_votes}
                onChange={e => handleFieldChange('max_votes', parseInt(e.target.value, 10))}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num} className="bg-slate-900 text-gray-100">
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Poll closes at <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.closes_at}
                onChange={e => handleFieldChange('closes_at', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`${inputClass} ${validationErrors.closes_at ? 'border-red-500' : ''}`}
              />
              {validationErrors.closes_at && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.closes_at}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-gray-100">Allow vote changes</p>
                <p className="text-sm text-gray-400">Attendees can change their vote before the poll closes</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_vote_changes}
                  onChange={e => handleFieldChange('allow_vote_changes', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/10 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#4f0f69] peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8A4FFF]/40" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-gray-100">Anonymous voting</p>
                <p className="text-sm text-gray-400">Hide voter identities in results</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_anonymous}
                  onChange={e => handleFieldChange('allow_anonymous', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/10 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#4f0f69] peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8A4FFF]/40" />
              </label>
            </div>
          </div>

          {errors.polls && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/40 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
              <div>
                <h3 className="text-sm font-medium text-red-200">Failed to create poll</h3>
                <p className="mt-1 text-sm text-red-300/90">{errors.polls}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCreatingPoll}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] px-4 py-2 font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting || isCreatingPoll ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
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

const OptionInput = ({ index, option, pollType, onChange, onRemove, canRemove }) => {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-sm font-medium text-gray-200">Option {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-400 transition-colors hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={option.label}
          onChange={e => onChange(index, 'label', e.target.value)}
          placeholder={
            pollType === 'artist_selection'
              ? 'Artist name (e.g., Drake)'
              : pollType === 'theme_selection'
                ? 'Theme name (e.g., Neon Nights)'
                : pollType === 'feature_selection'
                  ? 'Feature name (e.g., VIP Lounge)'
                  : 'Option label'
          }
          required
          className={inputClass}
        />

        {pollType === 'artist_selection' && (
          <>
            <input
              type="text"
              value={option.artist_name || ''}
              onChange={e => onChange(index, 'artist_name', e.target.value)}
              placeholder="Full artist name (required)"
              className={inputClass}
            />
            <input
              type="text"
              value={option.artist_genre || ''}
              onChange={e => onChange(index, 'artist_genre', e.target.value)}
              placeholder="Genre (e.g., Hip-hop, Electronic)"
              className={inputClass}
            />
          </>
        )}

        <textarea
          value={option.description || ''}
          onChange={e => onChange(index, 'description', e.target.value)}
          placeholder="Brief description (optional)"
          rows={2}
          className={inputClass}
        />
      </div>
    </div>
  );
};

export default SimplePollCreator;
