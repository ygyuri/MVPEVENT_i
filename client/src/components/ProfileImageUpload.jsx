import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Camera, Upload, X, User, Check } from 'lucide-react';

const ProfileImageUpload = ({ currentImage, onImageChange, disabled = false }) => {
  const { isDarkMode } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Simulate upload (replace with actual API call)
    setTimeout(() => {
      onImageChange(file);
      setIsUploading(false);
    }, 1000);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setError(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="relative">
      {/* Profile Image Display */}
      <div className="relative group">
        <div 
          onClick={handleClick}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden cursor-pointer transition-all duration-200 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
          } ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
        >
          {preview || currentImage ? (
            <img 
              src={preview || currentImage} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={`w-8 h-8 sm:w-10 sm:h-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        {!disabled && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}

        {/* Upload Status */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          </div>
        )}

        {/* Success Indicator */}
        {preview && !isUploading && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`mt-2 w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-2xl border transition-colors text-sm ${
          disabled || isUploading
            ? isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>{preview || currentImage ? 'Change Photo' : 'Upload Photo'}</span>
          </>
        )}
      </button>

      {/* Remove Button */}
      {(preview || currentImage) && !disabled && (
        <button
          onClick={handleRemoveImage}
          className="mt-1 w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-2xl border transition-colors bg-red-50 border-red-200 text-red-600 hover:bg-red-100 text-sm"
        >
          <X className="w-4 h-4" />
          <span>Remove Photo</span>
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-1 p-2 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs">
          {error}
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Help Text */}
      <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        JPG, PNG or GIF. Max size 5MB.
      </p>
    </div>
  );
};

export default ProfileImageUpload;
