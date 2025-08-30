import React, { createContext, useContext, useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Apply theme to document
    document.documentElement.classList.toggle('dark', isDarkMode);
    
    // Update CSS custom properties
    updateThemeColors(isDarkMode);
  }, [isDarkMode]);

  const updateThemeColors = (darkMode) => {
    const root = document.documentElement;
    
    if (darkMode) {
      // Dark mode - Blue Web3 feel
      root.style.setProperty('--bg-primary', 'linear-gradient(135deg, #111827 0%, #1E3A8A 50%, #111827 100%)');
      root.style.setProperty('--bg-secondary', 'linear-gradient(135deg, #111827 0%, #1E40AF 50%, #111827 100%)');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--bg-card-hover', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#E5E7EB');
      root.style.setProperty('--text-muted', '#9CA3AF');
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--card-hover-border', 'rgba(59, 130, 246, 0.2)');
    } else {
      // Light mode - White Web3 feel
      root.style.setProperty('--bg-primary', 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #FFFFFF 100%)');
      root.style.setProperty('--bg-secondary', 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #FFFFFF 100%)');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--bg-card-hover', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--text-primary', '#1E293B');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748B');
      root.style.setProperty('--card-border', 'rgba(59, 130, 246, 0.1)');
      root.style.setProperty('--card-hover-border', 'rgba(59, 130, 246, 0.2)');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme Toggle Component
export const ThemeToggle = ({ className = '', size = 'default' }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        rounded-full p-2 transition-all duration-300 transform hover:scale-110
        ${isDarkMode 
          ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {isDarkMode ? (
        <Sun className="w-full h-full" />
      ) : (
        <Moon className="w-full h-full" />
      )}
    </button>
  );
};

// Theme Status Component
export const ThemeStatus = () => {
  const { isDarkMode, theme } = useTheme();
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isDarkMode 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}>
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </span>
    </div>
  );
};
