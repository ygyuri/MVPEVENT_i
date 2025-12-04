import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Image, Upload, Plus, X, Eye, AlertCircle } from 'lucide-react';
import { updateNestedFormData, setStepValidation } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { imageUtils } from '../../../utils/eventHelpers';

const MediaStep = () => {
  const dispatch = useDispatch();
  const { formData, validation, eventId } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  // Keyboard support for modal
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && imagePreview) {
        setImagePreview(null);
      }
    };

    if (imagePreview) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [imagePreview]);

  // Real-time validation for media
  const validateMedia = (updatedMedia) => {
    const stepValidation = stepValidators.validateMedia({
      ...formData,
      media: updatedMedia
    });
    
    dispatch(setStepValidation({
      step: 7,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
    
    return stepValidation;
  };

  const updateMedia = (field, value) => {
    const updatedMedia = {
      ...formData.media,
      [field]: value
    };
    
    dispatch(updateNestedFormData({ path: `media.${field}`, value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    validateMedia(updatedMedia);
  };

  const addGalleryImage = (url) => {
    const currentGallery = formData.media?.galleryUrls || [];
    updateMedia('galleryUrls', [...currentGallery, url]);
  };

  const removeGalleryImage = (index) => {
    const currentGallery = formData.media?.galleryUrls || [];
    updateMedia('galleryUrls', currentGallery.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;


    // Clear previous upload errors
    setUploadErrors({});

    // Check if adding these files would exceed the limit
    const currentGalleryCount = formData.media?.galleryUrls?.length || 0;
    const maxGalleryImages = 10;
    
    if (currentGalleryCount + files.length > maxGalleryImages) {
      alert(`You can only add up to ${maxGalleryImages} gallery images. You currently have ${currentGalleryCount} and are trying to add ${files.length} more.`);
      return;
    }

    setUploading(true);
    const uploadResults = [];
    const errors = [];
    const successfulDataUrls = [];

    // Process files in parallel for better performance
    const uploadPromises = files.map(async (file, index) => {
      try {
        // Validate file type
        if (!imageUtils.isValidFileType(file)) {
          const fileType = imageUtils.getFileTypeCategory(file);
          throw new Error(`Unsupported file type: ${file.name} (${fileType}). Please select a valid file (JPG, PNG, GIF, WebP, SVG, BMP, TIFF, PDF, HEIC)`);
        }

        // Check file size (max 5MB per file for better performance)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File too large: ${file.name}. Maximum size is 5MB per file.`);
        }

        // Update progress
        setUploadProgress(prev => ({ ...prev, [index]: 0 }));

        let processedFile = file;

        // Handle HEIC files - currently not supported
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
          console.warn('⚠️ [HEIC FILE] Not supported:', file.name);
          throw new Error(`HEIC files are not currently supported. Please convert "${file.name}" to JPEG format manually before uploading.`);
        }

        // Compress image if it's an image file
        processedFile = await imageUtils.compressImage(processedFile, 1.5, 0.85);
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [index]: 50 }));
        
        // Convert to base64 data URL for storage in form state
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(processedFile);
        });
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [index]: 100 }));
        
        if (event.target.id === 'coverImage') {
          updateMedia('coverImageUrl', dataUrl);
        } else {
          // Collect successful data URLs for batch update
          successfulDataUrls.push(dataUrl);
        }
        
        uploadResults.push({ success: true, fileName: file.name, dataUrl });
        
        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[index];
            return newProgress;
          });
        }, 1000);
        
      } catch (error) {
        console.error('❌ [PROCESSING FAILED]', { fileName: file.name, error: error.message });
        errors.push({ fileName: file.name, error: error.message });
        setUploadErrors(prev => ({ ...prev, [index]: error.message }));
      }
    });

    // Wait for all processing to complete
    await Promise.all(uploadPromises);
    
    // Batch update gallery with all successful data URLs
    if (event.target.id !== 'coverImage' && successfulDataUrls.length > 0) {
      const currentGallery = formData.media?.galleryUrls || [];
      updateMedia('galleryUrls', [...currentGallery, ...successfulDataUrls]);
    }
    
    setUploading(false);
    
    if (errors.length > 0) {
      // Show error summary
      const errorMessage = errors.length === 1 
        ? errors[0].error 
        : `${errors.length} files failed to process. Check console for details.`;
      alert(errorMessage);
    }
    
    // Clear the file input
    event.target.value = '';
  };

  const handleUrlInput = (url, type) => {
    if (imageUtils.isValidImageUrl(url)) {
      if (type === 'cover') {
        updateMedia('coverImageUrl', url);
      } else {
        addGalleryImage(url);
      }
    } else {
      alert('Please enter a valid image URL');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-pink-100 dark:bg-pink-900/20 rounded-full mx-auto mb-4">
          <Image className="w-8 h-8 text-pink-600 dark:text-pink-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Media & Assets
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add images to make your event more attractive and engaging for attendees.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0">
        {/* Cover Image */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cover Image
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200">
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Upload Cover Image
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Recommended: 1200x630px (2:1 ratio)
                  </p>
                  <input
                    id="coverImage"
                    type="file"
                    accept="image/*,.pdf,.svg,.bmp,.tiff"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="coverImage"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-200 disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Choose File'}
                  </label>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or enter image URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="coverImageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="input-modern flex-1"
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleUrlInput(e.target.value, 'cover');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = document.getElementById('coverImageUrl').value;
                      if (url) handleUrlInput(url, 'cover');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div>
              {formData.media?.coverImageUrl ? (
                <div className="relative">
                  <img
                    src={formData.media.coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => updateMedia('coverImageUrl', '')}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Image className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No cover image</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Images */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Gallery Images
          </h3>
          
          <div className="space-y-4">
            {/* Add Gallery Images */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200">
              <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Add Gallery Images
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select multiple images to showcase your event
                  </p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>• Up to 10 images total</p>
                    <p>• Max 5MB per file</p>
                    <p>• Supported: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, PDF</p>
                    <p>• HEIC files not supported - please convert to JPEG first</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <input
                    id="galleryImage"
                    type="file"
                    accept="image/*,.pdf,.svg,.bmp,.tiff"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="galleryImage"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 cursor-pointer transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    {uploading ? 'Uploading...' : 'Select Multiple Images'}
                  </label>
                  
                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Processing {Object.keys(uploadProgress).length} files...</span>
                    </div>
                  )}
                  
                  {/* Upload Errors */}
                  {Object.keys(uploadErrors).length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                            Upload Issues ({Object.keys(uploadErrors).length} files)
                          </p>
                          <ul className="text-red-700 dark:text-red-300 space-y-1 text-xs">
                            {Object.entries(uploadErrors).map(([index, error]) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                          <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                            💡 Tip: HEIC files are not supported. Please convert to JPEG format manually before uploading.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Current Gallery Count */}
                {formData.media?.galleryUrls && formData.media.galleryUrls.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{formData.media.galleryUrls.length}</span> of 10 images added
                  </div>
                )}

                {/* URL Input for Gallery */}
                <div className="max-w-md mx-auto">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="input-modern flex-1 text-sm"
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleUrlInput(e.target.value, 'gallery');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = event.target.previousElementSibling.value;
                        if (url) handleUrlInput(url, 'gallery');
                      }}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            {formData.media?.galleryUrls && formData.media.galleryUrls.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Gallery ({formData.media.galleryUrls.length} images)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove all gallery images?')) {
                        updateMedia('galleryUrls', []);
                      }
                    }}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {formData.media.galleryUrls.map((url, index) => (
                    <div key={index} className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="aspect-square">
                        <img
                          src={url}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={() => setImagePreview(url)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
                            title="View full size"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-lg"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Image number badge */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                        {index + 1}
                      </div>
                      
                      {/* Drag handle (for future reordering) */}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Gallery Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-4">
                    <span>Total: {formData.media.galleryUrls.length} images</span>
                    <span>Remaining: {10 - formData.media.galleryUrls.length} slots</span>
                  </div>
                  <div className="text-xs">
                    Click on images to view full size
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Media Summary */}
        {(formData.media?.coverImageUrl || (formData.media?.galleryUrls && formData.media.galleryUrls.length > 0)) && (
          <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-pink-900 dark:text-pink-200 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Media Summary
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-pink-800 dark:text-pink-300">
              <div>
                <strong>Cover Image:</strong> {formData.media?.coverImageUrl ? '✓ Added' : '✗ Missing'}
              </div>
              <div>
                <strong>Gallery Images:</strong> {formData.media?.galleryUrls?.length || 0} images
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-6xl max-h-full w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 rounded-t-lg">
              <h3 className="text-white font-medium">Image Preview</h3>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-black bg-opacity-50 rounded-b-lg">
              <div className="flex items-center justify-between text-white text-sm">
                <div className="flex items-center gap-4">
                  <span>Click outside to close</span>
                  <span>•</span>
                  <span>ESC key to close</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = imagePreview;
                      link.download = 'image.jpg';
                      link.click();
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 text-xs"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setImagePreview(null)}
          />
        </div>
      )}

      {/* Enhanced Help Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
              <Image className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
                Media Upload Tips
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">📸</span>
                    <span>Use high-quality images that represent your event well</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">📐</span>
                    <span>Cover image should be 1200x630px (2:1 ratio) for best results</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">🎯</span>
                    <span>Gallery images help attendees understand what to expect</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">⚖️</span>
                    <span>Ensure you have rights to use all images</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">🗜️</span>
                    <span>Images are automatically compressed for optimal performance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">🚀</span>
                    <span>Multiple file selection supported for faster uploads</span>
                  </div>
                </div>
              </div>
              
              {/* Technical Specs */}
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Technical Specifications</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <div>Max files: 10</div>
                  <div>Max size: 5MB each</div>
                  <div>Formats: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, PDF</div>
                  <div>Auto-compression: Enabled</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStep;
