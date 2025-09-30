import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Repeat, Calendar, Clock, AlertCircle } from 'lucide-react';
import { updateNestedFormData, setStepValidation, setBlurField } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { recurrenceUtils, dateUtils } from '../../../utils/eventHelpers';

const RecurrenceStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [endConditionType, setEndConditionType] = useState(null);

  // Initialize end condition type based on existing data
  React.useEffect(() => {
    if (formData.recurrence?.enabled) {
      if (formData.recurrence?.count) {
        setEndConditionType('count');
      } else if (formData.recurrence?.until) {
        setEndConditionType('until');
      }
    }
  }, [formData.recurrence?.enabled, formData.recurrence?.count, formData.recurrence?.until]);

  // Real-time validation for recurrence
  const validateRecurrence = (updatedRecurrence) => {
    const stepValidation = stepValidators.validateRecurrence({
      ...formData,
      recurrence: updatedRecurrence
    });
    
    dispatch(setStepValidation({
      step: 5,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
    
    return stepValidation;
  };

  const updateRecurrence = (field, value) => {
    console.log('🔄 [RECURRENCE UPDATE]', { field, value, currentRecurrence: formData.recurrence });
    
    const updatedRecurrence = {
      ...formData.recurrence,
      [field]: value
    };
    
    console.log('📝 [RECURRENCE PAYLOAD]', { 
      path: `recurrence.${field}`, 
      value, 
      updatedRecurrence,
      fullFormData: { ...formData, recurrence: updatedRecurrence }
    });
    
    dispatch(updateNestedFormData({ path: `recurrence.${field}`, value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Special handling for weekdays
    if (field === 'frequency' && value !== 'weekly') {
      console.log('🧹 [RECURRENCE CLEANUP] Clearing weekdays for non-weekly frequency');
      dispatch(updateNestedFormData({ path: 'recurrence.byWeekday', value: [] }));
    }
    
    validateRecurrence(updatedRecurrence);
  };

  const handleWeekdayToggle = (weekday) => {
    const currentWeekdays = formData.recurrence?.byWeekday || [];
    const newWeekdays = currentWeekdays.includes(weekday)
      ? currentWeekdays.filter(w => w !== weekday)
      : [...currentWeekdays, weekday].sort();
    
    updateRecurrence('byWeekday', newWeekdays);
  };

  const handleLimitTypeChange = (type) => {
    console.log('🔄 [END CONDITION] Changing to:', type);
    setEndConditionType(type);
    
    if (type === 'count') {
      updateRecurrence('until', null);
      updateRecurrence('count', 10); // Set default count
    } else {
      updateRecurrence('count', null);
      // Set default until date to 3 months from start date
      const startDate = formData.dates?.startDate;
      if (startDate) {
        const untilDate = new Date(startDate);
        untilDate.setMonth(untilDate.getMonth() + 3);
        updateRecurrence('until', untilDate.toISOString());
      } else {
        // If no start date, set to 3 months from now
        const untilDate = new Date();
        untilDate.setMonth(untilDate.getMonth() + 3);
        updateRecurrence('until', untilDate.toISOString());
      }
    }
  };

  // Generate occurrence preview
  const generateOccurrencePreview = () => {
    if (!formData.recurrence?.enabled || !formData.dates?.startDate || !formData.dates?.endDate) {
      return [];
    }

    const occurrences = recurrenceUtils.generateOccurrences(
      formData.dates.startDate,
      formData.dates.endDate,
      formData.recurrence
    );

    return occurrences.slice(0, 5); // Show first 5 occurrences
  };

  const occurrences = generateOccurrencePreview();
  const totalOccurrences = recurrenceUtils.generateOccurrences(
    formData.dates?.startDate,
    formData.dates?.endDate,
    formData.recurrence || {}
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl mx-auto mb-4 shadow-lg">
          <Repeat className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Recurring Events
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create a series of events that repeat automatically. Perfect for workshops, classes, or regular meetups.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Enable Recurrence Toggle */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Event Type
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Is this a one-time event or a recurring series?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => updateRecurrence('enabled', false)}
              className={`
                p-6 rounded-xl border-2 transition-all duration-200 text-left group
                ${!formData.recurrence?.enabled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${!formData.recurrence?.enabled
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {!formData.recurrence?.enabled && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg mb-1">One-Time Event</div>
                  <div className="text-sm opacity-75">Single occurrence only</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateRecurrence('enabled', true)}
              className={`
                p-6 rounded-xl border-2 transition-all duration-200 text-left group
                ${formData.recurrence?.enabled
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${formData.recurrence?.enabled
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {formData.recurrence?.enabled && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg mb-1">Recurring Series</div>
                  <div className="text-sm opacity-75">Multiple occurrences</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recurrence Settings */}
        {formData.recurrence?.enabled && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recurrence Pattern
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How often should this event repeat?
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Repeat Every *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {recurrenceUtils.frequencies.map((freq) => {
                    const descriptions = {
                      daily: 'Every day',
                      weekly: 'Every week',
                      monthly: 'Every month'
                    };
                    return (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => updateRecurrence('frequency', freq.value)}
                        className={`
                          p-4 rounded-xl border-2 transition-all duration-200 text-center group
                          ${formData.recurrence?.frequency === freq.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        `}
                      >
                        <div className="font-semibold text-lg mb-1">{freq.label}</div>
                        <div className="text-xs opacity-75">{descriptions[freq.value]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interval */}
              <div>
                <label htmlFor="interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Interval *
                </label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Every</span>
                  <input
                    id="interval"
                    type="number"
                    value={formData.recurrence?.interval || 1}
                    onChange={(e) => updateRecurrence('interval', parseInt(e.target.value) || 1)}
                    onBlur={() => setTouched(prev => ({ ...prev, interval: true }))}
                    min="1"
                    max="365"
                    className="input-modern w-20 text-center font-semibold"
                  />
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {formData.recurrence?.frequency || 'week'}{formData.recurrence?.interval > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  How many {formData.recurrence?.frequency || 'week'}{formData.recurrence?.interval > 1 ? 's' : ''} between each occurrence?
                </p>
              </div>

              {/* Weekday Selection (for weekly recurrence) */}
              {formData.recurrence?.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Days of the Week
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {recurrenceUtils.weekdays.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekdayToggle(day.value)}
                        className={`
                          p-3 rounded-xl border-2 transition-all duration-200 text-center text-sm font-medium
                          ${(formData.recurrence?.byWeekday || []).includes(day.value)
                            ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        `}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    💡 Select specific days for weekly recurrence, or leave empty to repeat on the same day of the week as your first event.
                  </p>
                </div>
              )}

              {/* Limit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  When Should It End? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleLimitTypeChange('count')}
                    className={`
                      p-6 rounded-xl border-2 transition-all duration-200 text-left group
                      ${endConditionType === 'count'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${endConditionType === 'count'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 dark:border-gray-600'
                        }
                      `}>
                        {endConditionType === 'count' && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">After N occurrences</div>
                        <div className="text-sm opacity-75">Stop after a specific number</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLimitTypeChange('until')}
                    className={`
                      p-6 rounded-xl border-2 transition-all duration-200 text-left group
                      ${endConditionType === 'until'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${endConditionType === 'until'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 dark:border-gray-600'
                        }
                      `}>
                        {endConditionType === 'until' && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">Until a date</div>
                        <div className="text-sm opacity-75">Stop by a specific date</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Count Input */}
              {endConditionType === 'count' && (
                <div>
                  <label htmlFor="count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    How Many Occurrences? *
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Stop after</span>
                    <input
                      id="count"
                      type="number"
                      value={formData.recurrence?.count || ''}
                      onChange={(e) => updateRecurrence('count', parseInt(e.target.value) || null)}
                      onBlur={() => setTouched(prev => ({ ...prev, count: true }))}
                      min="1"
                      max="100"
                      className="input-modern w-24 text-center font-semibold"
                      placeholder="10"
                    />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">occurrences</span>
                  </div>
                </div>
              )}

              {/* Until Date Input */}
              {endConditionType === 'until' && (
                <div>
                  <label htmlFor="until" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    End Date *
                  </label>
                  <div className="relative">
                    <input
                      id="until"
                      type="date"
                      value={formData.recurrence?.until ? dateUtils.formatDateForInput(formData.recurrence.until).split('T')[0] : ''}
                      onChange={(e) => updateRecurrence('until', e.target.value ? new Date(e.target.value).toISOString() : null)}
                      onBlur={() => setTouched(prev => ({ ...prev, until: true }))}
                      min={formData.dates?.startDate ? dateUtils.formatDateForInput(formData.dates.startDate).split('T')[0] : undefined}
                      className="input-modern w-full"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    📅 The series will end on or before this date
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recurrence Summary */}
        {formData.recurrence?.enabled && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
                  Recurrence Summary
                </h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Here's what your recurring series will look like
                </p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-indigo-800 dark:text-indigo-300">Pattern:</span>
                <span className="text-indigo-700 dark:text-indigo-400">{recurrenceUtils.getRecurrenceDescription(formData.recurrence)}</span>
              </div>
              
              {totalOccurrences > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-indigo-800 dark:text-indigo-300">Total Events:</span>
                  <span className="text-indigo-700 dark:text-indigo-400">{totalOccurrences} occurrences</span>
                </div>
              )}
              
              {formData.dates?.startDate && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-indigo-800 dark:text-indigo-300">First Event:</span>
                  <span className="text-indigo-700 dark:text-indigo-400">{dateUtils.formatDate(formData.dates.startDate, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Occurrence Preview */}
        {occurrences.length > 0 && (
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Events
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preview of your recurring series
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {occurrences.map((occurrence, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="text-gray-700 dark:text-gray-300">
                    <div className="font-medium">
                      {dateUtils.formatDate(occurrence.startDate, { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {dateUtils.formatDate(occurrence.startDate, { 
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {dateUtils.formatDate(occurrence.endDate, { 
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dateUtils.calculateDuration(occurrence.startDate, occurrence.endDate)}h
                  </div>
                </div>
              ))}
              
              {totalOccurrences > 5 && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    And {totalOccurrences - 5} more events...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">
                Recurring Events Tips
              </h4>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">💡</span>
                  <span>Perfect for workshops, classes, meetups, and regular events</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">📅</span>
                  <span>Each occurrence will be a separate published event</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">👥</span>
                  <span>Attendees can register for individual occurrences</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">⏰</span>
                  <span>Consider the duration between events when setting intervals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceStep;
