import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapPin, Globe, Building, Navigation } from 'lucide-react';
import { updateNestedFormData, setStepValidation, setBlurField } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { timezoneUtils } from '../../../utils/eventHelpers';

const LocationStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const commonTimezones = timezoneUtils.getCommonTimezones();
  const userTimezone = timezoneUtils.getUserTimezone();

  // Real-time validation
  const validateAndUpdateField = (fieldPath, value) => {
    const fieldName = fieldPath.split('.').pop();
    const error = validateField(fieldName, value, formData, 2);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    // Update nested form data
    dispatch(updateNestedFormData({ path: fieldPath, value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Update step validation
    const updatedLocation = {
      ...formData.location,
      [fieldName]: value
    };
    
    const stepValidation = stepValidators.validateLocation({
      ...formData,
      location: updatedLocation
    });
    
    dispatch(setStepValidation({
      step: 2,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
    
    // Log for debugging
    console.log('📍 [LOCATION STEP] Field updated:', { fieldPath, value, fieldName });
  };

  const handleTimezoneChange = (timezone) => {
    validateAndUpdateField('dates.timezone', timezone);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4">
          <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Location & Venue
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Where will your event take place? This helps attendees plan their visit.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Venue Name */}
        <div>
          <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Venue Name *
          </label>
          <div className="relative">
            <input
              id="venueName"
              type="text"
              value={formData.location?.venueName || ''}
              onChange={(e) => validateAndUpdateField('location.venueName', e.target.value)}
              onBlur={() => {
                setTouched(prev => ({ ...prev, venueName: true }));
                dispatch(setBlurField('location.venueName'));
              }}
              placeholder="e.g., KICC Convention Centre"
              className={`
                input-modern w-full
                ${fieldErrors.venueName && touched.venueName 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Building className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.venueName} 
            touched={touched.venueName}
          />
          
          {!fieldErrors.venueName && touched.venueName && formData.location?.venueName && (
            <FieldSuccess message="Venue name added!" />
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Street Address
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <div className="relative">
            <input
              id="address"
              type="text"
              value={formData.location?.address || ''}
              onChange={(e) => validateAndUpdateField('location.address', e.target.value)}
              onBlur={() => {
              setTouched(prev => ({ ...prev, address: true }));
              dispatch(setBlurField('location.address'));
            }}
              placeholder="e.g., 123 Main Street"
              className="input-modern w-full"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.address} 
            touched={touched.address}
          />
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            City *
          </label>
          <div className="relative">
            <input
              id="city"
              type="text"
              value={formData.location?.city || ''}
              onChange={(e) => validateAndUpdateField('location.city', e.target.value)}
              onBlur={() => {
                setTouched(prev => ({ ...prev, city: true }));
                dispatch(setBlurField('location.city'));
              }}
              placeholder="e.g., Nairobi"
              className={`
                input-modern w-full
                ${fieldErrors.city && touched.city 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Navigation className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.city} 
            touched={touched.city}
          />
          
          {!fieldErrors.city && touched.city && formData.location?.city && (
            <FieldSuccess message="City added!" />
          )}
        </div>

        {/* State/Province */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            State/Province
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <input
            id="state"
            type="text"
            value={formData.location?.state || ''}
            onChange={(e) => validateAndUpdateField('location.state', e.target.value)}
            onBlur={() => {
              setTouched(prev => ({ ...prev, state: true }));
              dispatch(setBlurField('location.state'));
            }}
            placeholder="e.g., Nairobi County"
            className="input-modern w-full"
          />
          
          <FieldValidation 
            error={fieldErrors.state} 
            touched={touched.state}
          />
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country *
          </label>
          <div className="relative">
            <input
              id="country"
              type="text"
              value={formData.location?.country || ''}
              onChange={(e) => validateAndUpdateField('location.country', e.target.value)}
              onBlur={() => {
                setTouched(prev => ({ ...prev, country: true }));
                dispatch(setBlurField('location.country'));
              }}
              placeholder="e.g., Kenya"
              className={`
                input-modern w-full
                ${fieldErrors.country && touched.country 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.country} 
            touched={touched.country}
          />
          
          {!fieldErrors.country && touched.country && formData.location?.country && (
            <FieldSuccess message="Country added!" />
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Postal Code
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <input
            id="postalCode"
            type="text"
            value={formData.location?.postalCode || ''}
            onChange={(e) => validateAndUpdateField('location.postalCode', e.target.value)}
            onBlur={() => {
              setTouched(prev => ({ ...prev, postalCode: true }));
              dispatch(setBlurField('location.postalCode'));
            }}
            placeholder="e.g., 00100"
            className="input-modern w-full"
          />
          
          <FieldValidation 
            error={fieldErrors.postalCode} 
            touched={touched.postalCode}
          />
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Timezone *
          </label>
          <div className="relative">
            <select
              id="timezone"
              value={formData.dates?.timezone || userTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              onBlur={() => {
                setTouched(prev => ({ ...prev, timezone: true }));
                dispatch(setBlurField('dates.timezone'));
              }}
              className={`
                input-modern w-full
                ${fieldErrors.timezone && touched.timezone 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            >
              <option value="">Select timezone</option>
              {commonTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.timezone} 
            touched={touched.timezone}
          />
          
          {!fieldErrors.timezone && touched.timezone && formData.dates?.timezone && (
            <FieldSuccess message="Timezone selected!" />
          )}
          
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This determines when your event appears in local time for attendees.
          </p>
        </div>
      </div>

      {/* Location Preview */}
      {(formData.location?.venueName || formData.location?.city) && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Location Preview
            </h4>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">
                  {formData.location?.venueName || 'Venue Name'}
                </p>
                <p>
                  {[
                    formData.location?.address,
                    formData.location?.city,
                    formData.location?.state,
                    formData.location?.country,
                    formData.location?.postalCode
                  ].filter(Boolean).join(', ')}
                </p>
                {formData.dates?.timezone && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Timezone: {timezoneUtils.formatTimezone(formData.dates.timezone)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900 dark:text-green-200 mb-1">
                Location Tips
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                <li>• Provide the exact venue name to help attendees find the location</li>
                <li>• Include the full address for GPS navigation</li>
                <li>• Select the correct timezone for accurate event times</li>
                <li>• Consider adding parking information in the description</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationStep;
