import React from 'react';
import { Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

const RecoveryModal = ({ 
  isOpen, 
  onClose, 
  onRecover, 
  onDiscard, 
  lastSavedTime, 
  type = 'draft' // 'draft' or 'recovery'
}) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'unknown time';
    
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getModalContent = () => {
    if (type === 'draft') {
      return {
        title: 'Saved Draft Found',
        message: `You have a saved draft from ${formatTimeAgo(lastSavedTime)}. Would you like to recover it?`,
        icon: <CheckCircle className="w-8 h-8 text-[#4f0f69]" />,
        primaryAction: 'Recover Draft',
        secondaryAction: 'Start Fresh'
      };
    } else {
      return {
        title: 'Unsaved Changes Detected',
        message: `Found unsaved changes from ${formatTimeAgo(lastSavedTime)}. Would you like to recover them?`,
        icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
        primaryAction: 'Recover Changes',
        secondaryAction: 'Discard Changes'
      };
    }
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className={cn(
          "absolute inset-0 backdrop-blur-sm transition-opacity duration-300",
          isDarkMode 
            ? "bg-black/60" 
            : "bg-white/60"
        )}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          "relative w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl",
          "border transition-all duration-300 transform",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4",
          isDarkMode
            ? "bg-slate-900/95 border-slate-700/50 backdrop-blur-xl"
            : "bg-white/95 border-gray-200/50 backdrop-blur-xl"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full transition-colors",
            "hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-[#4f0f69]/20",
            isDarkMode
              ? "text-gray-400 hover:bg-white/10"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {content.icon}
          </div>

          {/* Title */}
          <h3 className={cn(
            "text-xl font-semibold mb-3",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            {content.title}
          </h3>

          {/* Message */}
          <p className={cn(
            "text-sm leading-relaxed mb-6",
            isDarkMode ? "text-gray-300" : "text-gray-600"
          )}>
            {content.message}
          </p>

          {/* Time indicator */}
          {lastSavedTime && (
            <div className={cn(
              "flex items-center justify-center gap-2 mb-6 p-3 rounded-lg",
              isDarkMode 
                ? "bg-slate-800/50 border border-slate-700/50" 
                : "bg-gray-50 border border-gray-200"
            )}>
              <Clock className={cn(
                "w-4 h-4",
                isDarkMode ? "text-[#8A4FFF]" : "text-[#4f0f69]"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                Last saved: {formatTimeAgo(lastSavedTime)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onRecover}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] hover:from-[#6b1a8a] hover:to-[#8A4FFF]",
                "text-white shadow-lg hover:shadow-xl",
                "focus:outline-none focus:ring-2 focus:ring-[#4f0f69]/20",
                "transform hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {content.primaryAction}
            </button>
            
            <button
              onClick={onDiscard}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                "border focus:outline-none focus:ring-2",
                "transform hover:scale-[1.02] active:scale-[0.98]",
                isDarkMode
                  ? "border-slate-600 text-gray-300 hover:bg-slate-800/50 focus:ring-slate-500/20"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500/20"
              )}
            >
              {content.secondaryAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryModal;