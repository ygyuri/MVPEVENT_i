import React from 'react';
import { cn } from '../../utils/cn';
import { statusUtils } from '../../utils/eventHelpers';

const EventStatusBadge = ({ 
  status, 
  className = '',
  size = 'default',
  showIcon = true,
  showText = true
}) => {
  const statusInfo = statusUtils.getStatusInfo(status);

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'draft':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          border: 'border-gray-200 dark:border-gray-700',
          icon: 'text-gray-600 dark:text-gray-400'
        };
      case 'published':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400'
        };
      case 'cancelled':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-800 dark:text-red-200',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400'
        };
      case 'completed':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          border: 'border-gray-200 dark:border-gray-700',
          icon: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const styles = getStatusStyles(status);

  const getStatusIcon = () => {
    if (!showIcon) return null;

    const iconClass = cn(iconSizes[size], styles.icon);

    switch (status) {
      case 'draft':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case 'published':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-200',
        'border backdrop-blur-sm',
        sizeClasses[size],
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
      role="status"
      aria-label={`Event status: ${statusInfo.label}`}
    >
      {getStatusIcon()}
      {showText && (
        <span className="capitalize">
          {statusInfo.label}
        </span>
      )}
    </span>
  );
};

// Status indicator with additional info (e.g., event date)
export const EventStatusWithInfo = ({ 
  status, 
  eventDate = null,
  className = '',
  showDate = true
}) => {
  const { dateUtils } = require('../../utils/eventHelpers');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <EventStatusBadge status={status} />
      
      {showDate && eventDate && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>{dateUtils.formatDate(eventDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
};

export default EventStatusBadge;
