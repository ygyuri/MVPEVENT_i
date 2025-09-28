import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DollarSign, Users, Globe, Calculator } from 'lucide-react';
import { updateFormData, updateNestedFormData, setStepValidation } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { currencyUtils } from '../../../utils/eventHelpers';

const PricingStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Real-time validation
  const validateAndUpdateField = (fieldName, value) => {
    const error = validateField(fieldName, value, formData, 4);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    // Update form data
    dispatch(updateFormData({ field: fieldName, value, step: 4 }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Update step validation
    const stepValidation = stepValidators.validatePricing({
      ...formData,
      [fieldName]: value
    });
    
    dispatch(setStepValidation({
      step: 4,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
  };

  // Real-time validation for nested pricing
  const validateAndUpdatePricing = (fieldName, value) => {
    const error = validateField(fieldName, value, formData, 4);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    // Update nested pricing data
    dispatch(updateNestedFormData({ path: `pricing.${fieldName}`, value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Update step validation
    const updatedPricing = {
      ...formData.pricing,
      [fieldName]: value
    };
    
    const stepValidation = stepValidators.validatePricing({
      ...formData,
      pricing: updatedPricing
    });
    
    dispatch(setStepValidation({
      step: 4,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
  };

  const handleFreeToggle = (isFree) => {
    validateAndUpdatePricing('isFree', isFree);
    if (isFree) {
      validateAndUpdatePricing('price', 0);
    }
  };

  const handleCurrencyChange = (currency) => {
    validateAndUpdatePricing('currency', currency);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pricing Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set your event pricing and capacity. You can make it free or paid.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Free/Paid Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Event Type *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleFreeToggle(true)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${formData.pricing?.isFree === true
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${formData.pricing?.isFree === true
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {formData.pricing?.isFree === true && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium">Free Event</div>
                  <div className="text-sm opacity-75">No cost to attend</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFreeToggle(false)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${formData.pricing?.isFree === false
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${formData.pricing?.isFree === false
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {formData.pricing?.isFree === false && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium">Paid Event</div>
                  <div className="text-sm opacity-75">Attendees pay to attend</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Price Input (only for paid events) */}
        {formData.pricing?.isFree === false && (
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Price *
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  {currencyUtils.getCurrencySymbol(formData.pricing?.currency || 'USD')}
                </span>
              </div>
              <input
                id="price"
                type="number"
                value={formData.pricing?.price || ''}
                onChange={(e) => validateAndUpdatePricing('price', parseFloat(e.target.value) || 0)}
                onBlur={() => setTouched(prev => ({ ...prev, price: true }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`
                  input-modern w-full
                  ${fieldErrors.price && touched.price 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  }
                `}
                style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            
            <FieldValidation 
              error={fieldErrors.price} 
              touched={touched.price}
            />
            
            {!fieldErrors.price && touched.price && formData.pricing?.price > 0 && (
              <FieldSuccess message="Price set successfully!" />
            )}
          </div>
        )}

        {/* Currency Selection */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Currency *
          </label>
          <div className="relative">
            <select
              id="currency"
              value={formData.pricing?.currency || 'USD'}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, currency: true }))}
              className={`
                input-modern w-full
                ${fieldErrors.currency && touched.currency 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              style={{ paddingRight: '3rem' }}
            >
              {currencyUtils.supportedCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.currency} 
            touched={touched.currency}
          />
        </div>

        {/* Event Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Capacity
            <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
          </label>
          <div className="relative">
            <input
              id="capacity"
              type="number"
              value={formData.capacity || ''}
              onChange={(e) => validateAndUpdateField('capacity', parseInt(e.target.value) || null)}
              onBlur={() => setTouched(prev => ({ ...prev, capacity: true }))}
              placeholder="e.g., 100"
              min="1"
              className={`
                input-modern w-full
                ${fieldErrors.capacity && touched.capacity 
                  ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <FieldValidation 
            error={fieldErrors.capacity} 
            touched={touched.capacity}
          />
          
          {!fieldErrors.capacity && touched.capacity && formData.capacity && (
            <FieldSuccess message="Capacity set!" />
          )}
          
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Maximum number of attendees allowed. Leave empty for unlimited capacity.
          </p>
        </div>

        {/* Pricing Summary */}
        {(formData.pricing || formData.capacity) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Pricing Summary
            </h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <div className="flex justify-between">
                <span>Event Type:</span>
                <span className="font-medium">
                  {formData.pricing?.isFree ? 'Free Event' : 'Paid Event'}
                </span>
              </div>
              
              {formData.pricing?.isFree === false && formData.pricing?.price && (
                <div className="flex justify-between">
                  <span>Price per ticket:</span>
                  <span className="font-medium">
                    {currencyUtils.formatCurrency(formData.pricing.price, formData.pricing.currency)}
                  </span>
                </div>
              )}
              
              {formData.capacity && (
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span className="font-medium">{formData.capacity} attendees</span>
                </div>
              )}
              
              {formData.pricing?.isFree === false && formData.pricing?.price && formData.capacity && (
                <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                  <span className="font-medium">Total Revenue Potential:</span>
                  <span className="font-bold">
                    {currencyUtils.formatCurrency(formData.pricing.price * formData.capacity, formData.pricing.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                Pricing Tips
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>• Free events attract more attendees but require other revenue sources</li>
                <li>• Research similar events in your area to set competitive pricing</li>
                <li>• Consider offering early bird discounts in the ticket types section</li>
                <li>• Set a realistic capacity based on your venue and resources</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
