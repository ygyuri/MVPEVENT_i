import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BookOpen, Tag, FileText, Hash } from 'lucide-react';
import { setStepValidation } from '../../../store/slices/eventFormSlice';
import { createEventDraft, updateEventDraft } from '../../../store/slices/organizerSlice';
import { categoriesAPI } from '../../../utils/organizerAPI';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import CategoryInput from '../../common/CategoryInput';
import { formUtils } from '../../../utils/eventHelpers';
import { useOptimizedFormField } from '../../../hooks/useOptimizedFormField';

const BasicInfoStep = () => {
  const dispatch = useDispatch();
  const { formData, validation, eventId } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Use optimized form field hook
  const { updateField, cleanup } = useOptimizedFormField(
    formData, 
    eventId, 
    { createEventDraft, updateEventDraft }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Real-time validation with optimized updates
  const validateAndUpdateField = async (fieldName, value) => {
    const error = validateField(fieldName, value, formData, 1);
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Optimized field update (instant Redux + smart persistence)
    await updateField(fieldName, value, 1, {
      debounceMs: 200, // Faster debounce for better UX
      skipPersistence: false
    });
    
    // Update step validation
    const stepValidation = stepValidators.validateBasicInfo({
      ...formData,
      [fieldName]: value
    });
    
    dispatch(setStepValidation({
      step: 1,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
  };

  // Character count helpers
  const getCharacterCount = (text, maxLength) => {
    const count = text?.length || 0;
    return { count, remaining: maxLength - count, isOverLimit: count > maxLength };
  };

  const titleCount = getCharacterCount(formData.title, 255);
  const descriptionCount = getCharacterCount(formData.description, 5000);
  const shortDescriptionCount = getCharacterCount(formData.shortDescription, 300);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Basic Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us about your event. This information will be visible to attendees.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Event Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Title *
          </label>
          <div className="relative">
            <input
              id="title"
              type="text"
              value={formData.title || ''}
              onChange={(e) => validateAndUpdateField('title', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
              placeholder="e.g., React Conference 2024"
              className={`
                input-modern w-full pr-20
                ${fieldErrors.title && touched.title 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              maxLength={255}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
              {titleCount.count}/255
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.title} 
            touched={touched.title}
          />
          
          {!fieldErrors.title && touched.title && formData.title && (
            <FieldSuccess message="Great title!" />
          )}
        </div>

        {/* Event Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Description *
          </label>
          <div className="relative">
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => validateAndUpdateField('description', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
              placeholder="Provide a detailed description of your event. What will attendees learn or experience?"
              rows={6}
              className={`
                input-modern w-full resize-none pr-20
                ${fieldErrors.description && touched.description 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              maxLength={5000}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400">
              {descriptionCount.count}/5000
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.description} 
            touched={touched.description}
          />
          
          {!fieldErrors.description && touched.description && formData.description && (
            <FieldSuccess message="Detailed description added!" />
          )}
        </div>

        {/* Short Description */}
        <div>
          <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Short Description
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <div className="relative">
            <input
              id="shortDescription"
              type="text"
              value={formData.shortDescription || ''}
              onChange={(e) => validateAndUpdateField('shortDescription', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, shortDescription: true }))}
              placeholder="A brief one-line summary for event cards and previews"
              className={`
                input-modern w-full pr-20
                ${fieldErrors.shortDescription && touched.shortDescription 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              maxLength={300}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
              {shortDescriptionCount.count}/300
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.shortDescription} 
            touched={touched.shortDescription}
          />
          
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This will be shown in event previews and search results.
          </p>
        </div>

        {/* Event Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Category *
          </label>
          <CategoryInput
            value={formData.category}
            onChange={(categoryId) => validateAndUpdateField('category', categoryId)}
            onBlur={() => setTouched(prev => ({ ...prev, category: true }))}
            error={fieldErrors.category}
            touched={touched.category}
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <div className="relative">
            <input
              id="tags"
              type="text"
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
              onChange={(e) => {
                const raw = e.target.value;
                const tags = raw
                  .split(',')
                  .map(tag => tag.trim())
                  .map(tag => tag.replace(/^[\[\s'"`]+|[\]\s'"`]+$/g, ''))
                  .filter(Boolean);
                console.log('🏷️ [TAGS INPUT] Parsed tags:', tags);
                validateAndUpdateField('tags', tags);
              }}
              onBlur={() => setTouched(prev => ({ ...prev, tags: true }))}
              placeholder="e.g., react, javascript, conference, networking"
              className="input-modern w-full"
            />
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Hash className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Separate tags with commas. These help people discover your event.
          </p>
          
          {/* Display tags */}
          {formData.tags && formData.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Writing Tips
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Use a clear, descriptive title that explains what your event is about</li>
                <li>• Include key details like what attendees will learn or experience</li>
                <li>• Mention any special speakers, topics, or activities</li>
                <li>• Choose relevant tags to help people find your event</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
