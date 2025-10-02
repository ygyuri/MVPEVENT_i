import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Wifi, WifiOff, Users, RefreshCw, AlertCircle } from 'lucide-react';

export const ConnectionStatus = ({
  isConnected = false,
  connectionError = null,
  viewerCount = 0,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  onReconnect = () => {},
  lastConnected = null
}) => {
  const { isDarkMode } = useTheme();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const formatLastConnected = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border border-gray-200 dark:border-gray-700 p-4`}>
      <div className="flex items-center justify-between">
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Live
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Offline
                </span>
              </div>
            )}
          </div>

          {/* Viewer Count */}
          <div className="flex items-center gap-1">
            <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {viewerCount} viewing
            </span>
          </div>
        </div>

        {/* Reconnect Button */}
        {!isConnected && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting || reconnectAttempts >= maxReconnectAttempts}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isReconnecting || reconnectAttempts >= maxReconnectAttempts
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }
              ${isDarkMode 
                ? 'text-gray-300 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
          </button>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">
              {connectionError.message || 'Connection error'}
            </span>
          </div>
        </div>
      )}

      {/* Reconnect Attempts */}
      {!isConnected && reconnectAttempts > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Reconnect attempts: {reconnectAttempts}/{maxReconnectAttempts}
            </span>
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Last connected: {formatLastConnected(lastConnected)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(reconnectAttempts / maxReconnectAttempts) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Connection Quality Indicator */}
      {isConnected && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Excellent connection
          </span>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;