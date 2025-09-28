import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  MoreVertical,
  Play,
  Pause,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';
import EnhancedButton from '../EnhancedButton';
import { dateUtils } from '../../utils/eventHelpers';

const EventActions = ({ 
  event, 
  onAction, 
  compact = false,
  showLabels = true,
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Handle action click
  const handleAction = useCallback(async (action) => {
    setActionLoading(action);
    try {
      await onAction?.(action, event._id, event);
    } finally {
      setActionLoading(null);
      setShowMenu(false);
    }
  }, [onAction, event]);
  
  // Get available actions based on event status
  const getAvailableActions = useCallback(() => {
    const actions = [];
    
    // View action (always available)
    actions.push({
      key: 'view',
      label: 'View Event',
      icon: Eye,
      variant: 'secondary',
      className: 'text-blue-600 hover:text-blue-700'
    });
    
    // Edit action (available for drafts and published events)
    if (event.status === 'draft' || event.status === 'published') {
      actions.push({
        key: 'edit',
        label: 'Edit Event',
        icon: Edit,
        variant: 'secondary',
        className: 'text-green-600 hover:text-green-700'
      });
    }
    
    // Clone action (always available)
    actions.push({
      key: 'clone',
      label: 'Clone Event',
      icon: Copy,
      variant: 'secondary',
      className: 'text-purple-600 hover:text-purple-700'
    });
    
    // Status-specific actions
    switch (event.status) {
      case 'draft':
        actions.push({
          key: 'publish',
          label: 'Publish Event',
          icon: Play,
          variant: 'primary',
          className: 'text-green-600 hover:text-green-700'
        });
        break;
        
      case 'published':
        actions.push({
          key: 'unpublish',
          label: 'Unpublish Event',
          icon: Pause,
          variant: 'secondary',
          className: 'text-yellow-600 hover:text-yellow-700'
        });
        break;
        
      case 'published':
      case 'draft':
        actions.push({
          key: 'cancel',
          label: 'Cancel Event',
          icon: X,
          variant: 'secondary',
          className: 'text-red-600 hover:text-red-700'
        });
        break;
    }
    
    // Analytics action (for published events)
    if (event.status === 'published') {
      actions.push({
        key: 'analytics',
        label: 'View Analytics',
        icon: BarChart3,
        variant: 'secondary',
        className: 'text-indigo-600 hover:text-indigo-700'
      });
    }
    
    // Delete action (available for drafts and cancelled events)
    if (event.status === 'draft' || event.status === 'cancelled') {
      actions.push({
        key: 'delete',
        label: 'Delete Event',
        icon: Trash2,
        variant: 'danger',
        className: 'text-red-600 hover:text-red-700'
      });
    }
    
    return actions;
  }, [event.status]);
  
  const availableActions = getAvailableActions();
  
  // Compact mode - show only primary actions
  if (compact) {
    const primaryActions = availableActions.filter(action => 
      ['view', 'edit', 'publish', 'unpublish'].includes(action.key)
    );
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {primaryActions.slice(0, 2).map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action.key)}
            disabled={actionLoading === action.key}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              action.className
            } ${
              actionLoading === action.key 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={action.label}
          >
            <action.icon className="w-4 h-4" />
          </button>
        ))}
        
        {availableActions.length > 2 && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                >
                  <div className="py-2">
                    {availableActions.slice(2).map((action) => (
                      <button
                        key={action.key}
                        onClick={() => handleAction(action.key)}
                        disabled={actionLoading === action.key}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-200 ${
                          actionLoading === action.key 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        } ${action.className}`}
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }
  
  // Full mode - show all actions with labels
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {availableActions.map((action) => (
        <EnhancedButton
          key={action.key}
          variant={action.variant}
          size="sm"
          onClick={() => handleAction(action.key)}
          disabled={actionLoading === action.key}
          loading={actionLoading === action.key}
          icon={action.icon}
          className={action.className}
        >
          {showLabels && action.label}
        </EnhancedButton>
      ))}
    </div>
  );
};

// Event Status Badge Component
export const EventStatusBadge = ({ status, className = '' }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: Edit
        };
      case 'published':
        return {
          label: 'Published',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          icon: CheckCircle
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
          icon: X
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
          icon: Calendar
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: AlertCircle
        };
    }
  };
  
  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className} ${className}`}>
      <config.icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Event Quick Stats Component
export const EventQuickStats = ({ event, className = '' }) => {
  const stats = [
    {
      label: 'Attendees',
      value: event.attendees?.length || 0,
      total: event.capacity || '∞',
      icon: Users,
      className: 'text-blue-600'
    },
    {
      label: 'Revenue',
      value: event.revenue || 0,
      currency: event.pricing?.currency || 'USD',
      icon: DollarSign,
      className: 'text-green-600'
    },
    {
      label: 'Views',
      value: event.views || 0,
      icon: Eye,
      className: 'text-purple-600'
    }
  ];
  
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <stat.icon className={`w-4 h-4 ${stat.className}`} />
          <span className="text-gray-600 dark:text-gray-400">
            {stat.label}:
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {stat.value}
            {stat.total && `/${stat.total}`}
            {stat.currency && ` ${stat.currency}`}
          </span>
        </div>
      ))}
    </div>
  );
};

// Event Date Display Component
export const EventDateDisplay = ({ event, className = '' }) => {
  const startDate = new Date(event.dates?.startDate);
  const endDate = new Date(event.dates?.endDate);
  const isMultiDay = startDate.toDateString() !== endDate.toDateString();
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Calendar className="w-4 h-4 text-gray-500" />
      <div>
        <div className="text-gray-900 dark:text-white">
          {dateUtils.formatEventDate(event.dates)}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {dateUtils.formatEventTime(event.dates)}
        </div>
      </div>
    </div>
  );
};

export default EventActions;
