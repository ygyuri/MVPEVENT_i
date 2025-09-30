import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Calendar, Clock, Timer, AlertCircle, CheckCircle, Zap, CalendarDays, Clock3 } from 'lucide-react';
import { updateNestedFormData, setStepValidation, setBlurField } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { dateUtils } from '../../../utils/eventHelpers';

const ScheduleStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Quick presets for common event durations
  const eventPresets = [
    { label: '30 min', duration: 30, icon: '⚡' },
    { label: '1 hour', duration: 60, icon: '⏰' },
    { label: '2 hours', duration: 120, icon: '🕐' },
    { label: 'Half day', duration: 240, icon: '🌅' },
    { label: 'Full day', duration: 480, icon: '🌞' },
    { label: 'Weekend', duration: 2880, icon: '🏖️' }
  ];

  // Real-time validation
  const validateAndUpdateField = (fieldPath, value) => {
    const fieldName = fieldPath.split('.').pop();
    const error = validateField(fieldName, value, formData, 3);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    // Update nested form data
    dispatch(updateNestedFormData({ path: fieldPath, value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Update step validation
    const updatedDates = {
      ...formData.dates,
      [fieldName]: value
    };
    
    const stepValidation = stepValidators.validateSchedule({
      ...formData,
      dates: updatedDates
    });
    
    dispatch(setStepValidation({
      step: 3,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
    
    // Log for debugging
    console.log('📅 [SCHEDULE STEP] Field updated:', { fieldPath, value, fieldName });
  };

  // Apply preset duration
  const applyPreset = (preset) => {
    if (!formData.dates?.startDate) {
      return;
    }
    
    setSelectedPreset(preset.label);
    const startDate = new Date(formData.dates.startDate);
    const endDate = new Date(startDate.getTime() + preset.duration * 60 * 1000);
    
    validateAndUpdateField('dates.endDate', endDate.toISOString());
  };

  // Calculate duration
  const calculateDuration = () => {
    if (formData.dates?.startDate && formData.dates?.endDate) {
      return dateUtils.calculateDuration(formData.dates.startDate, formData.dates.endDate);
    }
    return 0;
  };

  const duration = calculateDuration();

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  };

  // Check if dates are in the past
  const isStartDateInPast = formData.dates?.startDate && new Date(formData.dates.startDate) < new Date();
  const isEndDateInPast = formData.dates?.endDate && new Date(formData.dates.endDate) < new Date();

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDisplayTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-4 shadow-lg">
          <CalendarDays className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          When's Your Event?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose the perfect time for your event. We'll help you get it just right.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8 px-4 sm:px-0">
        {/* Start Date & Time Section */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Event Starts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When does your event begin?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Input */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <div className="relative">
                <input
                  id="startDate"
                  type="date"
                  value={formData.dates?.startDate ? new Date(formData.dates.startDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (e.target.value && formData.dates?.startDate) {
                      // Preserve the time, update only the date
                      const existingTime = new Date(formData.dates.startDate);
                      const newDate = new Date(e.target.value);
                      newDate.setHours(existingTime.getHours());
                      newDate.setMinutes(existingTime.getMinutes());
                      validateAndUpdateField('dates.startDate', newDate.toISOString());
                    } else if (e.target.value) {
                      // Set to noon if no existing time
                      const newDate = new Date(e.target.value);
                      newDate.setHours(12, 0, 0, 0);
                      validateAndUpdateField('dates.startDate', newDate.toISOString());
                    } else {
                      validateAndUpdateField('dates.startDate', null);
                    }
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, startDate: true }));
                    dispatch(setBlurField('dates.startDate'));
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  className={`
                    input-modern w-full
                    ${fieldErrors.startDate && touched.startDate 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500'
                    }
                  `}
                />
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time
              </label>
              <div className="relative">
                <input
                  id="startTime"
                  type="time"
                  value={formData.dates?.startDate ? new Date(formData.dates.startDate).toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    if (e.target.value && formData.dates?.startDate) {
                      // Preserve the date, update only the time
                      const existingDate = new Date(formData.dates.startDate);
                      const [hours, minutes] = e.target.value.split(':');
                      existingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      validateAndUpdateField('dates.startDate', existingDate.toISOString());
                    } else if (e.target.value && formData.dates?.startDate) {
                      // If we have a date but no time, set the time
                      const existingDate = new Date(formData.dates.startDate);
                      const [hours, minutes] = e.target.value.split(':');
                      existingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      validateAndUpdateField('dates.startDate', existingDate.toISOString());
                    }
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, startDate: true }));
                    dispatch(setBlurField('dates.startDate'));
                  }}
                  className={`
                    input-modern w-full
                    ${fieldErrors.startDate && touched.startDate 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500'
                    }
                  `}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Clock3 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Date Display */}
          {formData.dates?.startDate && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {formatDisplayDate(formData.dates.startDate)} at {formatDisplayTime(formData.dates.startDate)}
                </span>
              </div>
            </div>
          )}

          <FieldValidation 
            error={fieldErrors.startDate} 
            touched={touched.startDate}
          />

          {isStartDateInPast && (
            <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">This date is in the past</span>
            </div>
          )}
        </div>

        {/* Duration Presets */}
        {formData.dates?.startDate && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  How Long?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose a duration or set custom times
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {eventPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border transition-all duration-200
                    ${selectedPreset === preset.label
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-sm font-medium">{preset.label}</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click any duration to automatically set your end time
            </div>
          </div>
        )}

        {/* End Date & Time Section */}
        {formData.dates?.startDate && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Event Ends
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  When does your event finish?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Input */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <div className="relative">
                  <input
                    id="endDate"
                    type="date"
                    value={formData.dates?.endDate ? new Date(formData.dates.endDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => {
                      if (e.target.value && formData.dates?.endDate) {
                        // Preserve the time, update only the date
                        const existingTime = new Date(formData.dates.endDate);
                        const newDate = new Date(e.target.value);
                        newDate.setHours(existingTime.getHours());
                        newDate.setMinutes(existingTime.getMinutes());
                        validateAndUpdateField('dates.endDate', newDate.toISOString());
                      } else if (e.target.value) {
                        // Set to 1 hour after start if no existing time
                        const startDate = new Date(formData.dates.startDate);
                        const newDate = new Date(e.target.value);
                        newDate.setHours(startDate.getHours() + 1, startDate.getMinutes(), 0, 0);
                        validateAndUpdateField('dates.endDate', newDate.toISOString());
                      } else {
                        validateAndUpdateField('dates.endDate', null);
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, endDate: true }));
                      dispatch(setBlurField('dates.endDate'));
                    }}
                    min={formData.dates?.startDate ? new Date(formData.dates.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                    className={`
                      input-modern w-full
                      ${fieldErrors.endDate && touched.endDate 
                        ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500'
                      }
                    `}
                  />
                </div>
              </div>

              {/* Time Input */}
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <div className="relative">
                  <input
                    id="endTime"
                    type="time"
                    value={formData.dates?.endDate ? new Date(formData.dates.endDate).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      if (e.target.value && formData.dates?.endDate) {
                        // Preserve the date, update only the time
                        const existingDate = new Date(formData.dates.endDate);
                        const [hours, minutes] = e.target.value.split(':');
                        existingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        validateAndUpdateField('dates.endDate', existingDate.toISOString());
                      } else if (e.target.value && formData.dates?.startDate) {
                        // If we have a start date but no end time, set the time
                        const startDate = new Date(formData.dates.startDate);
                        const [hours, minutes] = e.target.value.split(':');
                        const endDate = new Date(startDate);
                        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        validateAndUpdateField('dates.endDate', endDate.toISOString());
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, endDate: true }));
                      dispatch(setBlurField('dates.endDate'));
                    }}
                    className={`
                      input-modern w-full
                      ${fieldErrors.endDate && touched.endDate 
                        ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500'
                      }
                    `}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Clock3 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* End Date Display */}
            {formData.dates?.endDate && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {formatDisplayDate(formData.dates.endDate)} at {formatDisplayTime(formData.dates.endDate)}
                  </span>
                </div>
              </div>
            )}

            <FieldValidation 
              error={fieldErrors.endDate} 
              touched={touched.endDate}
            />

            {isEndDateInPast && (
              <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">This date is in the past</span>
              </div>
            )}
          </div>
        )}

        {/* Event Summary */}
        {formData.dates?.startDate && formData.dates?.endDate && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Event Summary
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Here's how your event looks
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {duration < 60 ? `${duration} minutes` : 
                   duration === 60 ? '1 hour' : 
                   `${Math.floor(duration / 60)} hours ${duration % 60 ? `and ${duration % 60} minutes` : ''}`}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDisplayDate(formData.dates.startDate)} at {formatDisplayTime(formData.dates.startDate)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDisplayDate(formData.dates.endDate)} at {formatDisplayTime(formData.dates.endDate)}
                </span>
              </div>

              {/* Validation Status */}
              <div className="mt-4">
                {new Date(formData.dates.startDate) >= new Date(formData.dates.endDate) ? (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">End date must be after start date</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Perfect! Your event timing looks great</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                💡 Pro Tips
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• <strong>Weekend events</strong> tend to have higher attendance</li>
                <li>• <strong>Evening times</strong> (6-8 PM) work well for most audiences</li>
                <li>• <strong>Allow buffer time</strong> for setup and networking</li>
                <li>• <strong>Consider time zones</strong> if you have remote attendees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleStep;