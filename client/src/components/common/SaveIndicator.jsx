import React from 'react';
import { cn } from '../../utils/cn';
import { dateUtils } from '../../utils/eventHelpers';

const SaveIndicator = ({ 
  isDirty = false,
  isSaving = false,
  lastSaved = null,
  saveError = null,
  autoSaveEnabled = true,
  className = ''
}) => {
  const getStatusInfo = () => {
    if (saveError) {
      return {
        status: 'error',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        text: 'Save failed',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    }

    if (isSaving) {
      return {
        status: 'saving',
        icon: (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ),
        text: 'Saving...',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    }

    if (isDirty) {
      return {
        status: 'dirty',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        ),
        text: autoSaveEnabled ? 'Auto-saving...' : 'Unsaved changes',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    }

    if (lastSaved) {
      return {
        status: 'saved',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        text: 'Saved',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    }

    return {
      status: 'idle',
      icon: null,
      text: 'Ready',
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800/50',
      borderColor: 'border-gray-200 dark:border-gray-700'
    };
  };

  const statusInfo = getStatusInfo();

  const formatLastSaved = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return dateUtils.formatDate(timestamp, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
      'border backdrop-blur-sm',
      statusInfo.bgColor,
      statusInfo.borderColor,
      statusInfo.color,
      className
    )}>
      {statusInfo.icon}
      <span>{statusInfo.text}</span>
      
      {lastSaved && !isDirty && !isSaving && !saveError && (
        <span className="text-xs opacity-75">
          {formatLastSaved(lastSaved)}
        </span>
      )}
      
      {saveError && (
        <button
          onClick={() => window.location.reload()} // Simple retry mechanism
          className="ml-1 text-xs underline hover:no-underline focus:outline-none focus:underline"
          title="Click to retry"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default SaveIndicator;
