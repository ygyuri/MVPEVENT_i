import React, { createContext, useContext, useState, useCallback } from 'react';
import { Bell, X, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Notification Context
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider
export const NotificationProvider = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    desktop: true,
    sound: true,
    vibration: true,
    highPriorityOnly: false
  });
  const [permission, setPermission] = useState('default');

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Show toast notification
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date(),
      duration
    };

    setNotifications(prev => [notification, ...prev]);

    // Auto-remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);

    // Play sound if enabled
    if (settings.sound) {
      playNotificationSound();
    }

    // Vibrate if enabled and supported
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }

    return id;
  }, [settings.sound, settings.vibration]);

  // Show desktop notification
  const showDesktopNotification = useCallback(async (title, options = {}) => {
    if (!settings.desktop || permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Error showing desktop notification:', error);
      return false;
    }
  }, [settings.desktop, permission]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3'); // You'll need to add this file
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback to system beep
        console.log('\u0007'); // ASCII bell character
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Handle new update notification
  const notifyNewUpdate = useCallback(async (update) => {
    const isHighPriority = update.priority === 'high';
    
    // Skip if high priority only is enabled and update is not high priority
    if (settings.highPriorityOnly && !isHighPriority) {
      return;
    }

    const title = isHighPriority ? '🚨 High Priority Update' : '📢 New Update';
    const message = update.content.length > 100 
      ? `${update.content.substring(0, 100)}...` 
      : update.content;

    // Show toast
    showToast(message, isHighPriority ? 'warning' : 'info');

    // Show desktop notification
    await showDesktopNotification(title, {
      body: message,
      tag: `update-${update._id}`,
      requireInteraction: isHighPriority
    });
  }, [settings.highPriorityOnly, showToast, showDesktopNotification]);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const value = {
    notifications,
    settings,
    permission,
    requestPermission,
    showToast,
    showDesktopNotification,
    notifyNewUpdate,
    removeNotification,
    updateSettings
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Notification Container Component
export const NotificationContainer = () => {
  const { isDarkMode } = useTheme();
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${isDarkMode ? 'bg-gray-800' : 'bg-white'} 
            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
            p-4 transform transition-all duration-300 ease-in-out
            ${notification.type === 'warning' ? 'border-orange-300 dark:border-orange-600' : ''}
            ${notification.type === 'error' ? 'border-red-300 dark:border-red-600' : ''}
            ${notification.type === 'success' ? 'border-green-300 dark:border-green-600' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {notification.message}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`ml-2 p-1 rounded-full transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Notification Settings Panel
export const NotificationSettings = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const { settings, permission, requestPermission, updateSettings } = useNotifications();

  const handlePermissionRequest = async () => {
    await requestPermission();
  };

  const handleSettingChange = (key, value) => {
    updateSettings({ [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Notification Settings
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Permission Status */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Browser Permission
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                permission === 'granted' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : permission === 'denied'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>
                {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Set'}
              </span>
            </div>
            {permission !== 'granted' && (
              <button
                onClick={handlePermissionRequest}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Request Permission
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Desktop Notifications
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.desktop}
                onChange={(e) => handleSettingChange('desktop', e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.sound ? (
                  <Volume2 className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                ) : (
                  <VolumeX className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sound Alerts
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => handleSettingChange('sound', e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Vibration
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={(e) => handleSettingChange('vibration', e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  High Priority Only
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.highPriorityOnly}
                onChange={(e) => handleSettingChange('highPriorityOnly', e.target.checked)}
                className="rounded"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationProvider;