import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUpdateActions } from '../../hooks/useUpdateActions';
import { useSocket } from '../../hooks/useSocket';
import { Send, Image, Eye, AlertCircle, X, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage, validateImageFile, formatFileSize } from '../../utils/imageCompression';

export const UpdateComposer = ({ 
  eventId, 
  onUpdateCreated = () => {},
  onClose = () => {},
  isOpen = false,
  eventStatus = 'published' // To check if event is cancelled
}) => {
  const { isDarkMode } = useTheme();
  const { createUpdate, loading: actionLoading } = useUpdateActions();
  const { socket, isConnected } = useSocket(eventId);
  
  // Form state
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);
  
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Validation
  const isValid = content.trim().length >= 1 && content.trim().length <= 500;
  const isEventCancelled = eventStatus === 'cancelled';
  const canPost = isValid && !isSubmitting && !isEventCancelled;


  // Character count colors
  const getCharCountColor = () => {
    const length = content.length;
    if (length > 450) return 'text-red-500';
    if (length > 400) return 'text-orange-500';
    return isDarkMode ? 'text-gray-400' : 'text-gray-500';
  };

  // Handle file selection with validation and compression
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      // Check file count
      if (mediaFiles.length + validFiles.length >= 3) {
        errors.push('Maximum 3 images allowed');
        break;
      }

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        errors.push(validation.error);
        continue;
      }

      try {
        // Compress image
        const compressedFile = await compressImage(file);
        validFiles.push(compressedFile);
      } catch (error) {
        console.error('Compression failed:', error);
        errors.push(`Failed to process ${file.name}`);
      }
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} image(s) added and optimized`);
    }

    // Reset file input
    e.target.value = '';
  }, [mediaFiles.length]);

  // Remove media file
  const removeMediaFile = useCallback((index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;

    setIsSubmitting(true);
    
    try {
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('priority', priority);
      
      // Add media files
      mediaFiles.forEach((file, index) => {
        formData.append(`media_${index}`, file);
      });

      // Create update via API
      const response = await createUpdate(eventId, {
        content: content.trim(),
        priority,
        mediaFiles: mediaFiles
      });

      // Emit socket event for real-time updates
      if (socket && isConnected) {
        socket.emit('event:update_created', {
          eventId,
          update: response.data
        });
      }

      // Show success toast with attendee count
      const attendeeCount = response.attendeeCount || 0;
      toast.success(`Update sent to ${attendeeCount} attendees`, {
        duration: 4000,
        icon: '📢'
      });

      // Call success callback
      onUpdateCreated(response.data);

      // Reset form
      setContent('');
      setPriority('normal');
      setMediaFiles([]);
      setIsPreview(false);
      setRateLimitWarning(false);

      // Close modal if provided
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Failed to create update:', error);
      
      // Handle specific error types
      if (error.response?.status === 429) {
        setRateLimitWarning(true);
        toast.error('Rate limit exceeded. Please wait before posting again.', {
          duration: 6000
        });
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to post updates for this event');
      } else if (error.response?.status === 404) {
        toast.error('Event not found');
      } else {
        toast.error('Failed to post update. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle preview toggle
  const handlePreview = () => {
    if (!content.trim()) {
      toast.error('Please enter some content to preview');
      return;
    }
    setIsPreview(!isPreview);
  };

  // Get priority display
  const getPriorityDisplay = (priority) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20', icon: '🔴' };
      case 'high':
        return { label: 'High', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/20', icon: '⚠️' };
      case 'normal':
        return { label: 'Normal', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: '📢' };
      default:
        return { label: 'Normal', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: '📢' };
    }
  };

  const priorityDisplay = getPriorityDisplay(priority);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-gray-800/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'
      } rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Post Update
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Share an update with your attendees
            </p>
          </div>
          
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Event Status Warning */}
          {isEventCancelled && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                  This event has been cancelled. Updates cannot be posted.
                </span>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {!isConnected && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                  Real-time updates unavailable. Updates will still be posted.
                </span>
              </div>
            </div>
          )}

          {/* Rate Limit Warning */}
          {rateLimitWarning && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  Rate limit: Maximum 10 updates per hour. Please wait before posting again.
                </span>
              </div>
            </div>
          )}

          {/* Content Input */}
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Update Content
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share an update with your attendees..."
                className={`w-full min-h-[120px] px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2 transition
                  ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
                maxLength={500}
                disabled={isPreview || isSubmitting}
              />
              
              {/* Character Counter */}
              <div className="absolute bottom-3 right-3">
                <span className={`text-xs font-medium ${getCharCountColor()}`}>
                  {content.length}/500
                </span>
              </div>
            </div>
            
            {/* Character limit warning */}
            {content.length > 450 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Approaching character limit
              </p>
            )}
          </div>

          {/* Preview */}
          {isPreview && content && (
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  O
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Organizer
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date().toLocaleString()}
                  </p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${priorityDisplay.bg} ${priorityDisplay.color}`}>
                  <span>{priorityDisplay.icon}</span>
                  {priorityDisplay.label}
                </div>
              </div>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
                {content}
              </p>
              {mediaFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Media Files */}
          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Attachments ({mediaFiles.length}/3)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeMediaFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              
              {/* Priority Toggle */}
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priority:
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition
                    ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'}`}
                  disabled={isSubmitting}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>

              {/* Image Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaFiles.length >= 3 || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mediaFiles.length >= 3 || isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                <Upload className="w-4 h-4" />
                Add Image
                {mediaFiles.length > 0 && ` (${mediaFiles.length}/3)`}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!content.trim() || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !content.trim() || isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-4 h-4" />
                {isPreview ? 'Edit' : 'Preview'}
              </button>

              <button
                type="submit"
                disabled={!canPost}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Update
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </form>
      </div>
    </div>
  );
};

export default UpdateComposer;
