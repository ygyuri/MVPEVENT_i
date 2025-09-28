import React from 'react';
import { cn } from '../../utils/cn';

const FormValidation = ({ 
  errors = {}, 
  stepErrors = {},
  currentStep = null,
  className = '',
  showStepErrors = true,
  showFieldErrors = true
}) => {
  // Get errors for current step if specified
  const getCurrentStepErrors = () => {
    if (!showStepErrors || !currentStep) return {};
    return stepErrors[currentStep] || {};
  };

  // Combine all errors
  const allErrors = {
    ...errors,
    ...getCurrentStepErrors()
  };

  // Don't render if no errors
  if (Object.keys(allErrors).length === 0) {
    return null;
  }

  // Group errors by type
  const errorGroups = {
    required: [],
    validation: [],
    general: []
  };

  Object.entries(allErrors).forEach(([field, message]) => {
    if (message.includes('required') || message.includes('Please select')) {
      errorGroups.required.push({ field, message });
    } else if (field.includes('ticketTypes') || field.includes('salesWindow') || field.includes('dateRange')) {
      errorGroups.validation.push({ field, message });
    } else {
      errorGroups.general.push({ field, message });
    }
  });

  const renderErrorGroup = (groupName, errors, icon) => {
    if (errors.length === 0) return null;

    return (
      <div key={groupName} className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
            {groupName} Issues
          </h4>
        </div>
        <ul className="space-y-1">
          {errors.map(({ field, message }, index) => (
            <li key={`${field}-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">
                {field.includes('.') ? field.split('.').pop() : field}:
              </span>{' '}
              {message}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className={cn(
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">
            Please fix the following issues:
          </h3>

          <div className="space-y-4">
            {/* Required field errors */}
            {renderErrorGroup(
              'Required',
              errorGroups.required,
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}

            {/* Validation errors */}
            {renderErrorGroup(
              'Validation',
              errorGroups.validation,
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}

            {/* General errors */}
            {renderErrorGroup(
              'General',
              errorGroups.general,
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Error count summary */}
          <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-700">
            <p className="text-xs text-red-600 dark:text-red-400">
              {Object.keys(allErrors).length} issue{Object.keys(allErrors).length !== 1 ? 's' : ''} need{Object.keys(allErrors).length !== 1 ? '' : 's'} to be resolved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Field-level validation component
export const FieldValidation = ({ 
  error, 
  touched = false, 
  className = '',
  showOnlyWhenTouched = true 
}) => {
  // Don't show error if not touched and showOnlyWhenTouched is true
  if (!error || (showOnlyWhenTouched && !touched)) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-1 text-sm text-red-600 dark:text-red-400 mt-1',
      className
    )}>
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{error}</span>
    </div>
  );
};

// Success indicator for completed fields
export const FieldSuccess = ({ 
  message = 'Looks good!', 
  className = '',
  show = false 
}) => {
  if (!show) return null;

  return (
    <div className={cn(
      'flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mt-1',
      className
    )}>
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
};

export default FormValidation;
