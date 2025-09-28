import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  DollarSign, Users, Globe, Calculator, Plus, Trash2, Calendar, 
  AlertCircle, CheckCircle, Ticket, Crown, Zap, Target, Gift
} from 'lucide-react';
import { 
  updateFormData, updateNestedFormData, setStepValidation,
  addTicketType, updateTicketType, removeTicketType 
} from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { ticketUtils, currencyUtils, dateUtils } from '../../../utils/eventHelpers';

const PricingAndTicketsStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [pricingMode, setPricingMode] = useState('simple'); // 'simple' or 'advanced'

  const ticketTypes = formData.ticketTypes || [];

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

  // Ticket type management
  const handleAddTicketType = () => {
    dispatch(addTicketType());
  };

  const handleUpdateTicketType = (index, field, value) => {
    dispatch(updateTicketType({ index, updates: { [field]: value } }));
    setTouched(prev => ({ ...prev, [`ticketTypes.${index}.${field}`]: true }));
  };

  const handleRemoveTicketType = (index) => {
    dispatch(removeTicketType(index));
  };

  // Pricing mode handlers
  const handleFreeToggle = (isFree) => {
    validateAndUpdatePricing('isFree', isFree);
    if (isFree) {
      validateAndUpdatePricing('price', 0);
      // Clear ticket types for free events
      if (ticketTypes.length > 0) {
        ticketTypes.forEach((_, index) => {
          dispatch(removeTicketType(index));
        });
      }
    }
  };

  const handlePricingModeChange = (mode) => {
    setPricingMode(mode);
    
    if (mode === 'simple') {
      // Convert ticket types to simple pricing
      if (ticketTypes.length > 0) {
        const firstTicket = ticketTypes[0];
        validateAndUpdatePricing('price', firstTicket.price || 0);
        validateAndUpdatePricing('currency', firstTicket.currency || formData.pricing?.currency || 'USD');
        validateAndUpdateField('capacity', firstTicket.quantity || formData.capacity);
        
        // Remove all ticket types except the first one
        for (let i = ticketTypes.length - 1; i > 0; i--) {
          dispatch(removeTicketType(i));
        }
      }
    } else {
      // Convert simple pricing to ticket types
      if (formData.pricing?.price !== undefined && ticketTypes.length === 0) {
        dispatch(addTicketType({
          name: 'General Admission',
          price: formData.pricing.price,
          quantity: formData.capacity || 100,
          currency: formData.pricing.currency || 'USD',
          description: 'Standard event ticket'
        }));
      }
    }
  };

  // Calculate totals
  const totalQuantity = ticketUtils.calculateTotalQuantity(ticketTypes);
  const totalRevenue = ticketUtils.calculateTotalRevenue(ticketTypes);
  const exceedsCapacity = formData.capacity && totalQuantity > formData.capacity;

  // Quick ticket templates
  const ticketTemplates = [
    { 
      name: 'General Admission', 
      price: formData.pricing?.price || 25, 
      quantity: 100,
      icon: '🎫',
      description: 'Standard event access'
    },
    { 
      name: 'VIP', 
      price: (formData.pricing?.price || 25) * 1.5, 
      quantity: 20,
      icon: '👑',
      description: 'Premium access with perks'
    },
    { 
      name: 'Early Bird', 
      price: (formData.pricing?.price || 25) * 0.8, 
      quantity: 50,
      icon: '⚡',
      description: 'Limited time discount'
    },
    { 
      name: 'Student', 
      price: (formData.pricing?.price || 25) * 0.6, 
      quantity: 30,
      icon: '🎓',
      description: 'Student discount'
    }
  ];

  const applyTemplate = (template) => {
    dispatch(addTicketType(template));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl mx-auto mb-4 shadow-lg">
          <Ticket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pricing & Tickets
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set up your event pricing and create ticket options for attendees
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0">
        {/* Event Type Selection */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Event Type
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Is this a free or paid event?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleFreeToggle(true)}
              className={`
                p-6 rounded-xl border-2 transition-all duration-200 text-left group
                ${formData.pricing?.isFree === true
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${formData.pricing?.isFree === true
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {formData.pricing?.isFree === true && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg mb-1">Free Event</div>
                  <div className="text-sm opacity-75">No cost to attend • Open to everyone</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFreeToggle(false)}
              className={`
                p-6 rounded-xl border-2 transition-all duration-200 text-left group
                ${formData.pricing?.isFree === false
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${formData.pricing?.isFree === false
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}>
                  {formData.pricing?.isFree === false && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg mb-1">Paid Event</div>
                  <div className="text-sm opacity-75">Set pricing • Multiple ticket options</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Free Event Setup */}
        {formData.pricing?.isFree === true && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Free Event Setup
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set your event capacity for the free event
                </p>
              </div>
            </div>

            <div className="max-w-md">
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
                  className="input-modern w-full"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Maximum number of attendees. Leave empty for unlimited capacity.
              </p>
            </div>
          </div>
        )}

        {/* Paid Event Setup */}
        {formData.pricing?.isFree === false && (
          <>
            {/* Pricing Mode Selection */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pricing Structure
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose how you want to set up your pricing
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handlePricingModeChange('simple')}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200 text-left
                    ${pricingMode === 'simple'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${pricingMode === 'simple'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}>
                      {pricingMode === 'simple' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Simple Pricing</div>
                      <div className="text-sm opacity-75">One price for all tickets</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePricingModeChange('advanced')}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200 text-left
                    ${pricingMode === 'advanced'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${pricingMode === 'advanced'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}>
                      {pricingMode === 'advanced' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg mb-1">Multiple Ticket Types</div>
                      <div className="text-sm opacity-75">Different prices and options</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Simple Pricing */}
            {pricingMode === 'simple' && (
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Simple Pricing
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Set one price for all tickets
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ticket Price *
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
                        className="input-modern w-full"
                        style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                      />
                    </div>
                    <FieldValidation 
                      error={fieldErrors.price} 
                      touched={touched.price}
                    />
                  </div>

                  {/* Currency */}
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency *
                    </label>
                    <div className="relative">
                      <select
                        id="currency"
                        value={formData.pricing?.currency || 'USD'}
                        onChange={(e) => validateAndUpdatePricing('currency', e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, currency: true }))}
                        className="input-modern w-full"
                        style={{ paddingRight: '3rem' }}
                      >
                        {currencyUtils.supportedCurrencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Capacity
                    </label>
                    <div className="relative">
                      <input
                        id="capacity"
                        type="number"
                        value={formData.capacity || ''}
                        onChange={(e) => validateAndUpdateField('capacity', parseInt(e.target.value) || null)}
                        onBlur={() => setTouched(prev => ({ ...prev, capacity: true }))}
                        placeholder="100"
                        min="1"
                        className="input-modern w-full"
                        style={{ paddingRight: '3rem' }}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Preview */}
                {formData.pricing?.price && formData.capacity && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Total Revenue Potential:
                      </span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {currencyUtils.formatCurrency(
                          formData.pricing.price * formData.capacity, 
                          formData.pricing.currency
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Pricing - Multiple Ticket Types */}
            {pricingMode === 'advanced' && (
              <div className="space-y-6">
                {/* Quick Templates */}
                {ticketTypes.length === 0 && (
                  <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Quick Start Templates
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Choose a template to get started quickly
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ticketTemplates.map((template, index) => (
                        <button
                          key={index}
                          onClick={() => applyTemplate(template)}
                          className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 transition-colors duration-200 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{template.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {template.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {currencyUtils.formatCurrency(template.price, formData.pricing?.currency || 'USD')} • {template.quantity} tickets
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Ticket Type */}
                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Ticket Types
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create different ticket options for your event
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTicketType}
                      className="btn-web3-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Ticket Type
                    </button>
                  </div>

                  {/* Ticket Types List */}
                  {ticketTypes.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <Ticket className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No ticket types yet
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Add your first ticket type or choose a template above
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticketTypes.map((ticket, index) => {
                        const ticketValidation = ticketUtils.validateTicketType(ticket);
                        
                        return (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                {ticket.name || `Ticket Type #${index + 1}`}
                              </h4>
                              {ticketTypes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTicketType(index)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors duration-200"
                                  title="Remove ticket type"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Ticket Name */}
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Ticket Name *
                                </label>
                                <input
                                  type="text"
                                  value={ticket.name || ''}
                                  onChange={(e) => handleUpdateTicketType(index, 'name', e.target.value)}
                                  onBlur={() => setTouched(prev => ({ ...prev, [`ticketTypes.${index}.name`]: true }))}
                                  placeholder="e.g., General Admission, VIP, Early Bird"
                                  className="input-modern w-full"
                                />
                              </div>

                              {/* Price */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Price *
                                </label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                      {currencyUtils.getCurrencySymbol(ticket.currency || formData.pricing?.currency || 'USD')}
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    value={ticket.price || ''}
                                    onChange={(e) => handleUpdateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, [`ticketTypes.${index}.price`]: true }))}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="input-modern w-full"
                                    style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                                  />
                                </div>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Quantity *
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={ticket.quantity || ''}
                                    onChange={(e) => handleUpdateTicketType(index, 'quantity', parseInt(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, [`ticketTypes.${index}.quantity`]: true }))}
                                    placeholder="100"
                                    min="1"
                                    className="input-modern w-full"
                                  />
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Description
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                                </label>
                                <textarea
                                  value={ticket.description || ''}
                                  onChange={(e) => handleUpdateTicketType(index, 'description', e.target.value)}
                                  onBlur={() => setTouched(prev => ({ ...prev, [`ticketTypes.${index}.description`]: true }))}
                                  placeholder="Describe what's included with this ticket type..."
                                  rows={2}
                                  className="input-modern w-full resize-none"
                                  maxLength={500}
                                />
                              </div>
                            </div>

                            {/* Ticket Revenue */}
                            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Revenue Potential:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {currencyUtils.formatCurrency(
                                    (ticket.price || 0) * (ticket.quantity || 0),
                                    ticket.currency || formData.pricing?.currency || 'USD'
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {ticketTypes.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Event Summary
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Here's your complete ticket breakdown
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                          {ticketTypes.length}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">
                          Ticket Types
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                          {totalQuantity}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">
                          Total Tickets
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                          {currencyUtils.formatCurrency(totalRevenue, formData.pricing?.currency || 'USD')}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">
                          Total Revenue
                        </div>
                      </div>
                    </div>

                    {/* Capacity Warning */}
                    {exceedsCapacity && (
                      <div className="flex items-center gap-2 p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Capacity Exceeded:</strong> Total tickets ({totalQuantity}) exceed event capacity ({formData.capacity}).
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Ticket className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
                💡 Pricing & Ticket Tips
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                <li>• <strong>Free events</strong> attract more attendees but require other revenue sources</li>
                <li>• <strong>Simple pricing</strong> works great for straightforward events</li>
                <li>• <strong>Multiple ticket types</strong> help maximize revenue (VIP, Early Bird, Student)</li>
                <li>• <strong>Research similar events</strong> in your area to set competitive pricing</li>
                <li>• <strong>Consider capacity</strong> based on your venue and resources</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingAndTicketsStep;
