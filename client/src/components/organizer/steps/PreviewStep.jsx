import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, Calendar, MapPin, Users, DollarSign, Clock, CheckCircle, AlertCircle, Repeat, ArrowRight, ExternalLink } from 'lucide-react';
import { setCurrentStep } from '../../../store/slices/eventFormSlice';
import { validateForm } from '../../../utils/eventValidation';
import { dateUtils, currencyUtils, recurrenceUtils } from '../../../utils/eventHelpers';
import EnhancedButton from '../../EnhancedButton';

const PreviewStep = ({ onSubmit }) => {
  const dispatch = useDispatch();
  const { formData } = useSelector(state => state.eventForm);
  const { loading } = useSelector(state => state.organizer);
  
  const [publishing, setPublishing] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  // Run final validation
  React.useEffect(() => {
    const validation = validateForm(formData);
    setValidationResults(validation);
    
    // Identify missing fields and map them to steps
    const fieldToStepMap = {
      'title': { step: 1, label: 'Basic Information', field: 'Event Title' },
      'description': { step: 1, label: 'Basic Information', field: 'Event Description' },
      'venueName': { step: 2, label: 'Location & Venue', field: 'Venue Name' },
      'city': { step: 2, label: 'Location & Venue', field: 'City' },
      'country': { step: 2, label: 'Location & Venue', field: 'Country' },
      'startDate': { step: 3, label: 'Schedule & Timing', field: 'Start Date' },
      'endDate': { step: 3, label: 'Schedule & Timing', field: 'End Date' },
      'capacity': { step: 4, label: 'Pricing & Tickets', field: 'Event Capacity' },
      'coverImageUrl': { step: 6, label: 'Media & Assets', field: 'Cover Image' }
    };
    
    const missing = [];
    if (validation.errors) {
      Object.keys(validation.errors).forEach(field => {
        if (fieldToStepMap[field]) {
          missing.push(fieldToStepMap[field]);
        }
      });
    }
    
    setMissingFields(missing);
  }, [formData]);

  const handlePublish = async () => {
    if (!validationResults?.isValid) {
      return;
    }

    setPublishing(true);
    try {
      // Log the final payload before submission
      console.log('🚀 [PUBLISH EVENT] Final payload being sent to backend:', {
        formData: formData,
        timestamp: new Date().toISOString(),
        validationResults: validationResults,
        missingFields: missingFields
      });
      
      // Log specific sections for debugging
      console.log('📋 [PUBLISH EVENT] Event Details:', {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category
      });
      
      console.log('📍 [PUBLISH EVENT] Location Details:', {
        location: formData.location
      });
      
      console.log('📅 [PUBLISH EVENT] Schedule Details:', {
        dates: formData.dates
      });
      
      console.log('💰 [PUBLISH EVENT] Pricing Details:', {
        capacity: formData.capacity,
        pricing: formData.pricing,
        ticketTypes: formData.ticketTypes
      });
      
      console.log('🎨 [PUBLISH EVENT] Media Details:', {
        media: formData.media
      });
      
      console.log('🔄 [PUBLISH EVENT] Recurrence Details:', {
        recurrence: formData.recurrence
      });
      
      console.log('🏷️ [PUBLISH EVENT] Tags & Flags:', {
        tags: formData.tags,
        flags: formData.flags
      });
      
      await onSubmit(formData);
    } catch (error) {
      console.error('❌ [PUBLISH EVENT] Publish failed:', error);
    } finally {
      setPublishing(false);
    }
  };

  const formatDuration = () => {
    if (formData.dates?.startDate && formData.dates?.endDate) {
      return dateUtils.calculateDuration(formData.dates.startDate, formData.dates.endDate);
    }
    return 0;
  };

  const getTotalTickets = () => {
    return formData.ticketTypes?.reduce((total, ticket) => total + (ticket.quantity || 0), 0) || 0;
  };

  const getTotalRevenue = () => {
    return formData.ticketTypes?.reduce((total, ticket) => total + ((ticket.price || 0) * (ticket.quantity || 0)), 0) || 0;
  };

  // Navigate to step with missing field
  const navigateToMissingField = (stepInfo) => {
    dispatch(setCurrentStep(stepInfo.step));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4">
          <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Preview & Publish
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your event details before publishing. Make sure everything looks correct.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0">
        {/* Validation Status */}
        {validationResults && (
          <div className={`
            rounded-lg p-4 border
            ${validationResults.isValid 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }
          `}>
            <div className="flex items-center gap-3">
              {validationResults.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h3 className={`font-medium ${
                  validationResults.isValid 
                    ? 'text-green-900 dark:text-green-200' 
                    : 'text-red-900 dark:text-red-200'
                }`}>
                  {validationResults.isValid ? 'Ready to Publish!' : 'Issues Found'}
                </h3>
                <p className={`text-sm ${
                  validationResults.isValid 
                    ? 'text-green-800 dark:text-green-300' 
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {validationResults.isValid 
                    ? 'All required fields are complete and valid.' 
                    : 'Please fix the errors below before publishing.'
                  }
                </p>
              </div>
            </div>
            
            {!validationResults.isValid && missingFields.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-red-800 dark:text-red-300 mb-3">
                  <strong>Missing required fields:</strong>
                </div>
                <div className="space-y-2">
                  {missingFields.map((fieldInfo, index) => (
                    <button
                      key={index}
                      onClick={() => navigateToMissingField(fieldInfo)}
                      className="flex items-center gap-2 w-full p-2 text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200"
                    >
                      <ExternalLink className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800 dark:text-red-200">
                          {fieldInfo.field}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          Step {fieldInfo.step}: {fieldInfo.label}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Cover Image */}
          {formData.media?.coverImageUrl && (
            <div className="h-48 bg-gray-200 dark:bg-gray-700">
              <img
                src={formData.media.coverImageUrl}
                alt="Event cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            {/* Event Title & Status */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {formData.title || 'Untitled Event'}
                </h1>
                {formData.shortDescription && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.shortDescription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                Ready to Publish
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date & Time
                </h3>
                <div className="space-y-2 text-sm">
                  {formData.dates?.startDate && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Start:</span>
                      <span className="text-gray-900 dark:text-white">
                        {dateUtils.formatDate(formData.dates.startDate)}
                      </span>
                    </div>
                  )}
                  {formData.dates?.endDate && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">End:</span>
                      <span className="text-gray-900 dark:text-white">
                        {dateUtils.formatDate(formData.dates.endDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDuration()} hours
                    </span>
                  </div>
                  {formData.dates?.timezone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Timezone:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formData.dates.timezone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location
                </h3>
                <div className="space-y-2 text-sm">
                  {formData.location?.venueName && (
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formData.location.venueName}
                    </div>
                  )}
                  <div className="text-gray-600 dark:text-gray-400">
                    {[
                      formData.location?.address,
                      formData.location?.city,
                      formData.location?.state,
                      formData.location?.country
                    ].filter(Boolean).join(', ')}
                  </div>
                  {formData.location?.postalCode && (
                    <div className="text-gray-600 dark:text-gray-400">
                      {formData.location.postalCode}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {formData.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Description
                </h3>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {formData.description}
                </div>
              </div>
            )}

            {/* Pricing & Tickets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5" />
                  Pricing
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formData.pricing?.isFree ? 'Free Event' : 'Paid Event'}
                    </span>
                  </div>
                  {formData.pricing?.isFree === false && formData.pricing?.price && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Price:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {currencyUtils.formatCurrency(formData.pricing.price, formData.pricing.currency)}
                      </span>
                    </div>
                  )}
                  {formData.capacity && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formData.capacity} attendees
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Types */}
              {formData.ticketTypes && formData.ticketTypes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5" />
                    Ticket Types
                  </h3>
                  <div className="space-y-2">
                    {formData.ticketTypes.map((ticket, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {ticket.name}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {ticket.quantity} tickets
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {currencyUtils.formatCurrency(ticket.price, ticket.currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-medium pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span>Total: {getTotalTickets()} tickets</span>
                      <span>{currencyUtils.formatCurrency(getTotalRevenue(), formData.pricing?.currency || 'USD')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recurrence */}
            {formData.recurrence?.enabled && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Repeat className="w-5 h-5" />
                  Recurrence
                </h3>
                <div className="text-gray-700 dark:text-gray-300">
                  {recurrenceUtils.getRecurrenceDescription(formData.recurrence)}
                </div>
              </div>
            )}

            {/* Tags */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {formData.media?.galleryUrls && formData.media.galleryUrls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Gallery ({formData.media.galleryUrls.length} images)
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {formData.media.galleryUrls.slice(0, 4).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  ))}
                  {formData.media.galleryUrls.length > 4 && (
                    <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                      +{formData.media.galleryUrls.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Publish Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <EnhancedButton
            variant="secondary"
            onClick={() => window.history.back()}
            disabled={publishing}
          >
            Back to Edit
          </EnhancedButton>
          
          <EnhancedButton
            variant="primary"
            onClick={handlePublish}
            disabled={!validationResults?.isValid || publishing}
            loading={publishing}
            icon={Eye}
            className="btn-web3-primary"
          >
            {publishing ? 'Publishing...' : 'Publish Event'}
          </EnhancedButton>
        </div>

        {/* Publish Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Once published, your event will be visible to attendees and they can start registering.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreviewStep;
