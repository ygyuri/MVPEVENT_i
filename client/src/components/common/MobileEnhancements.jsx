import React, { useState, useEffect, useRef, useCallback } from 'react';

// Touch optimization hook
export const useTouchOptimization = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  return isTouchDevice;
};

// Swipe navigation hook
export const useSwipeNavigation = (onSwipeLeft, onSwipeRight, options = {}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const { delta = 50 } = options;

  const minSwipeDistance = delta;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// Mobile keyboard handling hook
export const useMobileKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;

      if (heightDifference > 150) {
        setKeyboardHeight(heightDifference);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// Offline support hook
export const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = useCallback((key, data) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
      setOfflineData(prev => [...prev.filter(item => item.key !== key), { key, data }]);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }, []);

  const getOfflineData = useCallback((key) => {
    try {
      const data = localStorage.getItem(`offline_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }, []);

  const clearOfflineData = useCallback((key) => {
    try {
      localStorage.removeItem(`offline_${key}`);
      setOfflineData(prev => prev.filter(item => item.key !== key));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, []);

  return {
    isOnline,
    offlineData,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
  };
};

// Performance optimization hook
export const usePerformanceOptimization = () => {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState('fast');

  useEffect(() => {
    // Detect low-end device
    const checkLowEndDevice = () => {
      const memory = navigator.deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      const isLowEnd = memory <= 2 || cores <= 2;
      setIsLowEndDevice(isLowEnd);
    };

    // Detect connection speed
    const checkConnectionSpeed = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        setConnectionSpeed(effectiveType);
      }
    };

    checkLowEndDevice();
    checkConnectionSpeed();

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', checkConnectionSpeed);
      return () => navigator.connection.removeEventListener('change', checkConnectionSpeed);
    }
  }, []);

  return { isLowEndDevice, connectionSpeed };
};

// Mobile-optimized button component
export const MobileButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const touchClasses = isTouchDevice ? 'min-h-[44px] min-w-[44px]' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${touchClasses} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// Mobile-optimized input component
export const MobileInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();
  const { isKeyboardVisible } = useMobileKeyboard();

  const baseClasses = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200';
  const touchClasses = isTouchDevice ? 'min-h-[44px]' : '';
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`${baseClasses} ${touchClasses} ${errorClasses} ${className}`}
      style={{
        marginBottom: isKeyboardVisible ? '20px' : '0',
      }}
      {...props}
    />
  );
};

// Mobile-optimized card component
export const MobileCard = ({
  children,
  onClick,
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();

  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200';
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : '';
  const touchClasses = isTouchDevice ? 'p-4' : 'p-6';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${interactiveClasses} ${touchClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Mobile-optimized modal component
export const MobileModal = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  ...props
}) => {
  const { keyboardHeight } = useMobileKeyboard();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
      }}
      {...props}
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-t-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:rounded-lg">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {title}
            </h3>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized navigation component
export const MobileNavigation = ({
  items = [],
  currentItem,
  onItemClick,
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();

  return (
    <nav
      className={`flex space-x-1 ${isTouchDevice ? 'p-2' : 'p-4'} ${className}`}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            currentItem === item.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          } ${isTouchDevice ? 'min-h-[44px]' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};

// Mobile-optimized list component
export const MobileList = ({
  items = [],
  renderItem,
  onItemClick,
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          onClick={() => onItemClick?.(item)}
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
            onItemClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''
          } ${isTouchDevice ? 'p-4' : 'p-6'}`}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

// Mobile-optimized form component
export const MobileForm = ({
  children,
  onSubmit,
  className = '',
  ...props
}) => {
  const { keyboardHeight } = useMobileKeyboard();

  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 ${className}`}
      style={{
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
      }}
      {...props}
    >
      {children}
    </form>
  );
};

// Mobile-optimized step indicator
export const MobileStepIndicator = ({
  currentStep,
  totalSteps,
  steps = [],
  onStepClick,
  className = '',
  ...props
}) => {
  const isTouchDevice = useTouchOptimization();

  const stepLabels = steps.length > 0 ? steps : Array.from({ length: totalSteps }, (_, i) => `Step ${i + 1}`);

  return (
    <div className={`${className}`} {...props}>
      {/* Mobile Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        {stepLabels.map((label, index) => (
          <button
            key={index}
            onClick={() => onStepClick?.(index + 1)}
            className={`text-center ${isTouchDevice ? 'min-w-[44px] min-h-[44px]' : ''} ${
              index + 1 <= currentStep ? 'text-blue-600 dark:text-blue-400' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default {
  useTouchOptimization,
  useSwipeNavigation,
  useMobileKeyboard,
  useOfflineSupport,
  usePerformanceOptimization,
  MobileButton,
  MobileInput,
  MobileCard,
  MobileModal,
  MobileNavigation,
  MobileList,
  MobileForm,
  MobileStepIndicator,
};
