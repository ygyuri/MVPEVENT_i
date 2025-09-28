import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Focus management hook
export const useFocusManagement = () => {
  const location = useLocation();
  const previousPath = useRef();

  useEffect(() => {
    // Skip focus management on initial load
    if (previousPath.current === undefined) {
      previousPath.current = location.pathname;
      return;
    }

    // Focus the main content area when route changes
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
    }

    previousPath.current = location.pathname;
  }, [location.pathname]);
};

// Skip to content link component
export const SkipToContent = () => {
  const handleSkip = (e) => {
    e.preventDefault();
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
};

// Screen reader only text component
export const ScreenReaderOnly = ({ children, className = '' }) => {
  return (
    <span className={`sr-only ${className}`}>
      {children}
    </span>
  );
};

// ARIA live region for announcements
export const LiveRegion = ({ message, priority = 'polite' }) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Enhanced button with proper ARIA attributes
export const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <span className="sr-only">Loading...</span>
      )}
      {children}
    </button>
  );
};

// Enhanced input with proper labeling
export const AccessibleInput = ({
  id,
  label,
  error,
  helpText,
  required = false,
  className = '',
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        className={`input-modern ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced select with proper labeling
export const AccessibleSelect = ({
  id,
  label,
  error,
  helpText,
  required = false,
  options = [],
  className = '',
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        className={`input-modern ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced textarea with proper labeling
export const AccessibleTextarea = ({
  id,
  label,
  error,
  helpText,
  required = false,
  className = '',
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <textarea
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        className={`input-modern ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced checkbox with proper labeling
export const AccessibleCheckbox = ({
  id,
  label,
  error,
  helpText,
  required = false,
  className = '',
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-start">
        <input
          id={id}
          type="checkbox"
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        <label
          htmlFor={id}
          className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      </div>
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400 ml-6" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced radio group with proper labeling
export const AccessibleRadioGroup = ({
  id,
  label,
  error,
  helpText,
  required = false,
  options = [],
  value,
  onChange,
  className = '',
  ...props
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </legend>
      
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              aria-describedby={describedBy}
              aria-invalid={error ? 'true' : 'false'}
              aria-required={required}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${error ? 'border-red-500' : ''} ${className}`}
              {...props}
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

// Enhanced table with proper headers
export const AccessibleTable = ({
  caption,
  headers = [],
  data = [],
  className = '',
  ...props
}) => {
  return (
    <div className="overflow-x-auto">
      <table
        className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}
        {...props}
      >
        {caption && (
          <caption className="sr-only">
            {caption}
          </caption>
        )}
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Enhanced modal with proper focus management
export const AccessibleModal = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      {...props}
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        
        <div
          ref={modalRef}
          className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${className}`}
          tabIndex={-1}
        >
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 id="modal-title" className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {title}
            </h3>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced tooltip with proper ARIA attributes
export const AccessibleTooltip = ({
  children,
  content,
  position = 'top',
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipRef = useRef(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      {...props}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-10 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg ${className}`}
          style={{
            [position]: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default {
  useFocusManagement,
  SkipToContent,
  ScreenReaderOnly,
  LiveRegion,
  AccessibleButton,
  AccessibleInput,
  AccessibleSelect,
  AccessibleTextarea,
  AccessibleCheckbox,
  AccessibleRadioGroup,
  AccessibleTable,
  AccessibleModal,
  AccessibleTooltip,
};
