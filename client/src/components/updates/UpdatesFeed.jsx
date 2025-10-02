import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEventUpdates } from '../../hooks/useEventUpdates';
import { useUpdateActions } from '../../hooks/useUpdateActions';
import { useSocket } from '../../hooks/useSocket';
import UpdateCard from './UpdateCard';
import UpdateComposer from './UpdateComposer';
import { useTheme } from '../../contexts/ThemeContext';
import { RefreshCw, Filter, Bell, Clock, Wifi, WifiOff } from 'lucide-react';

export const UpdatesFeed = ({ 
  eventId, 
  userRole = 'attendee',
  onNewUpdate = () => {},
  onUpdateReaction = () => {},
  autoRefreshInterval = 30000 // 30 seconds default
}) => {
  const { isDarkMode } = useTheme();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const feedRef = useRef(null);
  const autoRefreshRef = useRef(null);
  const countdownRef = useRef(null);

  const {
    updates,
    loading,
    error,
    hasMore,
    loadMore,
    refreshUpdates,
    addUpdate
  } = useEventUpdates(eventId);

  // Socket integration for real-time updates
  const { socket, isConnected } = useSocket(eventId, {
    onUpdate: (newUpdate) => {
      console.log('Real-time update received:', newUpdate);
      addUpdate(newUpdate);
      onNewUpdate(newUpdate);
    },
    onReaction: (reactionData) => {
      console.log('Real-time reaction received:', reactionData);
      // Handle real-time reactions
    }
  });

  const {
    reactToUpdate,
    markAsRead,
    editUpdate,
    deleteUpdate,
    loading: actionLoading
  } = useUpdateActions();

  // Filter updates based on priority
  const filteredUpdates = updates.filter(update => {
    if (priorityFilter === 'all') return true;
    return update.priority === priorityFilter;
  });

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUpdates();
      setLastRefresh(Date.now());
      onNewUpdate('refresh');
    } catch (error) {
      console.error('Failed to refresh updates:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh functionality
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    if (autoRefreshEnabled && !isConnected) {
      // Start countdown timer
      const startCountdown = () => {
        let timeLeft = autoRefreshInterval / 1000;
        setNextRefreshIn(timeLeft);
        
        countdownRef.current = setInterval(() => {
          timeLeft -= 1;
          setNextRefreshIn(timeLeft);
          
          if (timeLeft <= 0) {
            clearInterval(countdownRef.current);
            setNextRefreshIn(0);
          }
        }, 1000);
      };
      
      startCountdown();
      
      // Start auto-refresh
      autoRefreshRef.current = setInterval(() => {
        if (!isRefreshing && !loading) {
          console.log('Auto-refreshing updates...');
          handleRefresh();
          startCountdown(); // Restart countdown after refresh
        }
      }, autoRefreshInterval);
    }
  }, [autoRefreshEnabled, isConnected, isRefreshing, loading, autoRefreshInterval]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextRefreshIn(0);
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  // Handle update reactions
  const handleReaction = async (updateId, reactionType) => {
    try {
      await reactToUpdate(updateId, reactionType);
      onUpdateReaction(updateId, reactionType);
    } catch (error) {
      console.error('Failed to react to update:', error);
    }
  };

  // Handle marking update as read
  const handleMarkAsRead = async (updateId) => {
    try {
      await markAsRead(updateId);
    } catch (error) {
      console.error('Failed to mark update as read:', error);
    }
  };

  // Handle edit update (organizer only)
  const handleEditUpdate = async (updateId, content) => {
    try {
      await editUpdate(updateId, content);
    } catch (error) {
      console.error('Failed to edit update:', error);
    }
  };

  // Handle delete update (organizer only)
  const handleDeleteUpdate = async (updateId) => {
    try {
      await deleteUpdate(updateId);
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  // Auto-scroll to top when new updates arrive
  useEffect(() => {
    if (updates.length > 0 && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [updates.length]);

  // Manage auto-refresh
  useEffect(() => {
    if (isConnected) {
      // Stop auto-refresh when socket is connected
      stopAutoRefresh();
    } else {
      // Start auto-refresh when socket is disconnected
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [isConnected, startAutoRefresh, stopAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  if (loading && updates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
            Loading updates...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className={`w-16 h-16 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <RefreshCw className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Failed to load updates
        </h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          {error.message || 'Something went wrong while loading updates'}
        </p>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition
                ${isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'}`}
            >
              <option value="all">All Updates</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal</option>
              <option value="low">Low Priority</option>
            </select>
            <Filter className={`absolute right-2 top-2.5 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Auto-refresh Toggle */}
        <button
          onClick={toggleAutoRefresh}
          className={`p-2 rounded-lg transition-colors ${
            autoRefreshEnabled && !isConnected
              ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              : isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
          title={autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* Connection Status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
          isConnected 
            ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
        }`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>
            {isConnected ? 'Live' : `Next: ${Math.ceil(nextRefreshIn)}s`}
          </span>
        </div>

        {/* Notification Settings */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Update Composer (Organizer Only) */}
      {userRole === 'organizer' && (
        <UpdateComposer
          eventId={eventId}
          onUpdateCreated={onNewUpdate}
          embedded={true}
          eventStatus="published"
        />
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Connecting to live updates...
            </span>
          </div>
        </div>
      )}

      {/* Updates Feed */}
      <div 
        ref={feedRef}
        className="space-y-4 max-h-96 overflow-y-auto"
      >
        {filteredUpdates.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Bell className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              No updates yet
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {userRole === 'organizer' 
                ? 'Start sharing updates with your attendees'
                : 'Updates from the organizer will appear here'
              }
            </p>
          </div>
        ) : (
          filteredUpdates.map((update) => (
            <UpdateCard
              key={update._id}
              update={update}
              userRole={userRole}
              onReaction={handleReaction}
              onMarkAsRead={handleMarkAsRead}
              onEdit={handleEditUpdate}
              onDelete={handleDeleteUpdate}
              loading={actionLoading}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More Updates'}
          </button>
        </div>
      )}

      {/* Notification Settings Panel */}
      {showNotifications && (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border border-gray-200 dark:border-gray-700 p-4`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
            Notification Settings
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Desktop Notifications
              </span>
              <input type="checkbox" className="rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Sound Alerts
              </span>
              <input type="checkbox" className="rounded" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                High Priority Only
              </span>
              <input type="checkbox" className="rounded" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesFeed;