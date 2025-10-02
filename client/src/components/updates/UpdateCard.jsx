import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThumbsUp, Heart, Zap, AlertCircle, XCircle, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';

export const UpdateCard = ({ 
  update, 
  userRole = 'attendee',
  onReaction = () => {},
  onMarkAsRead = () => {},
  onEdit = () => {},
  onDelete = () => {},
  loading = false
}) => {
  const { isDarkMode } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(update.content);

  const reactions = [
    { type: 'like', icon: ThumbsUp, label: 'Like' },
    { type: 'love', icon: Heart, label: 'Love' },
    { type: 'clap', icon: Zap, label: 'Clap' },
    { type: 'surprised', icon: AlertCircle, label: 'Surprised' },
    { type: 'sad', icon: XCircle, label: 'Sad' }
  ];

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🚨';
      case 'low': return '📅';
      default: return '📢';
    }
  };

  const canEdit = userRole === 'organizer' && 
    (new Date() - new Date(update.createdAt)) < 5 * 60 * 1000; // 5 minutes

  const canDelete = userRole === 'organizer';

  const handleReaction = (reactionType) => {
    onReaction(update._id, reactionType);
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit(update._id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this update?')) {
      onDelete(update._id);
    }
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(update._id);
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow relative ${
      userRole === 'attendee' && !update.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {update.organizer?.name?.charAt(0) || 'O'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {update.organizer?.name || 'Organizer'}
              </h4>
              {update.priority !== 'normal' && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(update.priority)}`}>
                  {getPriorityIcon(update.priority)} {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)}
                </span>
              )}
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatTime(update.createdAt)}
              {update.editedAt && (
                <span className="ml-1">(edited)</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-1 rounded-full transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className={`absolute right-0 top-8 w-48 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10`}>
              <div className="py-1">
                {userRole === 'attendee' && (
                  <button
                    onClick={handleMarkAsRead}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Mark as Read
                  </button>
                )}
                
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Update
                  </button>
                )}
                
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:bg-gray-600' 
                        : 'text-red-600 hover:bg-gray-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete Update
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={`w-full h-24 px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2 transition
                ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(update.content);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
            {update.content}
          </p>
        )}
      </div>

      {/* Media */}
      {update.mediaUrls && update.mediaUrls.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            {update.mediaUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Update media ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    // Open in lightbox/modal
                    window.open(url, '_blank');
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {reactions.map((reaction) => {
            const userReaction = update.reactions?.find(r => r.type === reaction.type);
            const count = userReaction?.count || 0;
            const isUserReacted = update.userReactions?.includes(reaction.type);
            
            return (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                disabled={loading}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                  isUserReacted
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <reaction.icon className="w-4 h-4" />
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Read Status */}
        {userRole === 'attendee' && !update.isRead && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
              New
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateCard;