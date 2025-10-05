import React from 'react';
import { Loader } from 'lucide-react';

export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader className="w-12 h-12 text-purple-600 animate-spin mb-4" />
    <p className="text-gray-600 dark:text-gray-300 text-lg">{message}</p>
  </div>
);

export const PollCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden animate-pulse border border-gray-200 dark:border-gray-700">
    <div className="bg-gray-200 dark:bg-gray-700 h-24" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="space-y-2 mt-4">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  </div>
);

export const InlineLoader = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader className={`${sizeClasses[size]} text-purple-600 animate-spin`} />;
};

export const ButtonLoader = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
