import React, { createContext, useContext, useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import Tooltip from "../components/Tooltip";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;

    // If no saved preference, detect system preference
    if (saved === "auto" || !saved) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      return prefersDark;
    }

    return false; // Default to light
  });

  const [isAutoMode, setIsAutoMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    // Default to auto mode if no preference is saved
    return saved === "auto" || !saved;
  });

  // Function to get the appropriate theme based on auto mode and system preference
  const getEffectiveTheme = () => {
    if (isAutoMode) {
      // Use system preference instead of time
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return isDarkMode;
  };
  
  // Listen to system preference changes in auto mode
  useEffect(() => {
    if (!isAutoMode) return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const newEffectiveTheme = getEffectiveTheme();
      document.documentElement.classList.toggle("dark", newEffectiveTheme);
      updateThemeColors(newEffectiveTheme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isAutoMode]);

  const effectiveDarkMode = getEffectiveTheme();

  useEffect(() => {
    // Save theme preference to localStorage IMMEDIATELY
    if (isAutoMode) {
      localStorage.setItem("theme", "auto");
    } else {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }

    // Apply theme class with transition
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");

    if (wasDark !== effectiveDarkMode) {
      // Add transition class temporarily for smooth theme switch
      html.classList.add("theme-transitioning");
      setTimeout(() => {
        html.classList.remove("theme-transitioning");
      }, 300);
    }

    html.classList.toggle("dark", effectiveDarkMode);

    // Update CSS custom properties
    updateThemeColors(effectiveDarkMode);
  }, [isDarkMode, isAutoMode, effectiveDarkMode]);


  const updateThemeColors = (darkMode) => {
    const root = document.documentElement;
    const body = document.body;

    if (darkMode) {
      // Dark mode - Rich dark with blue accents
      root.style.setProperty("--text-primary", "#f9fafb"); // Almost white
      root.style.setProperty("--text-secondary", "#e5e7eb"); // Light gray
      root.style.setProperty("--text-muted", "#9ca3af"); // Medium gray
      body.style.color = "#f9fafb";
    } else {
      // Light mode - Dark text on light background
      root.style.setProperty("--text-primary", "#111827"); // Near black
      root.style.setProperty("--text-secondary", "#374151"); // Dark gray
      root.style.setProperty("--text-muted", "#6b7280"); // Medium gray
      body.style.color = "#111827";
    }

    // Set theme color for meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", darkMode ? "#0f172a" : "#ffffff");
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = darkMode ? "#0f172a" : "#ffffff";
      document.head.appendChild(meta);
    }
  };

  const toggleTheme = () => {
    if (isAutoMode) {
      // If currently in auto mode, switch to manual dark mode
      setIsAutoMode(false);
      setIsDarkMode(true);
    } else if (isDarkMode) {
      // If currently dark, switch to light
      setIsAutoMode(false);
      setIsDarkMode(false);
    } else {
      // If currently light, switch to auto mode
      setIsAutoMode(true);
    }
  };

  const value = {
    isDarkMode: effectiveDarkMode,
    isAutoMode,
    toggleTheme,
    theme: effectiveDarkMode ? "dark" : "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Theme Toggle Component
export const ThemeToggle = ({ className = "", size = "default" }) => {
  const { isDarkMode, isAutoMode, toggleTheme } = useTheme();

  // Hide toggle when in auto mode
  if (isAutoMode) {
    return null;
  }

  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-10 h-10",
    large: "w-12 h-12",
  };

  return (
    <Tooltip content={`Switch to ${isDarkMode ? "light" : "dark"} mode`}>
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          rounded-full p-2 transition-all duration-300 hover:scale-110
          ${
            isDarkMode
              ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
          }
          ${className}
        `}
        aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      >
        {isDarkMode ? (
          <Sun className="w-full h-full" />
        ) : (
          <Moon className="w-full h-full" />
        )}
      </button>
    </Tooltip>
  );
};

// Theme Status Component
export const ThemeStatus = () => {
  const { isDarkMode, isAutoMode, theme } = useTheme();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          isDarkMode
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            : "bg-gray-100 text-gray-600 border border-gray-200"
        }`}
      >
        {isAutoMode ? "🔄 Auto" : theme === "dark" ? "🌙 Dark" : "☀️ Light"}
      </span>
    </div>
  );
};
