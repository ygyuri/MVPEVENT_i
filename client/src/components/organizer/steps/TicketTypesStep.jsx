import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Trash2, Calendar, Users, DollarSign, AlertCircle } from 'lucide-react';
import { addTicketType, updateTicketType, removeTicketType, setStepValidation } from '../../../store/slices/eventFormSlice';
import { validateField, stepValidators } from '../../../utils/eventValidation';
import FormValidation, { FieldValidation, FieldSuccess } from '../../common/FormValidation';
import { ticketUtils, currencyUtils, dateUtils } from '../../../utils/eventHelpers';

const TicketTypesStep = () => {
  const dispatch = useDispatch();
  const { formData, validation } = useSelector(state => state.eventForm);
  
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const ticketTypes = formData.ticketTypes || [];

  // Real-time validation for ticket types
  const validateTicketTypes = () => {
    const stepValidation = stepValidators.validateTicketTypes(formData);
    dispatch(setStepValidation({
      step: 5,
      isValid: stepValidation.isValid,
      errors: stepValidation.errors
    }));
    return stepValidation;
  };

  const handleAddTicketType = () => {
    dispatch(addTicketType());
    // Validate after adding
    setTimeout(validateTicketTypes, 100);
  };

  const handleUpdateTicketType = (index, field, value) => {
    dispatch(updateTicketType({ index, updates: { [field]: value } }));
    // Mark field as touched
    setTouched(prev => ({ ...prev, [`ticketTypes.${index}.${field}`]: true }));
    // Validate after updating
    setTimeout(validateTicketTypes, 100);
  };

  const handleRemoveTicketType = (index) => {
    dispatch(removeTicketType(index));
    // Validate after removing
    setTimeout(validateTicketTypes, 100);
  };

  // Calculate totals
  const totalQuantity = ticketUtils.calculateTotalQuantity(ticketTypes);
  const totalRevenue = ticketUtils.calculateTotalRevenue(ticketTypes);
  const exceedsCapacity = formData.capacity && totalQuantity > formData.capacity;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mx-auto mb-4">
          <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ticket Types
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create different ticket options for your event. You can have multiple types with different prices.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
        {/* Add Ticket Type Button */}
        <div className="flex justify-between items-center">
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
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No ticket types yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add your first ticket type to get started
            </p>
            <button
              type="button"
              onClick={handleAddTicketType}
              className="btn-web3-primary"
            >
              Create First Ticket Type
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => {
              const ticketValidation = ticketUtils.validateTicketType(ticket);
              
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      Ticket Type #{index + 1}
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
                        className={`
                          input-modern w-full
                          ${!ticketValidation.isValid && touched[`ticketTypes.${index}.name`]
                            ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                          }
                        `}
                      />
                      {!ticketValidation.isValid && touched[`ticketTypes.${index}.name`] && (
                        <FieldValidation error={ticketValidation.errors.name} touched={true} />
                      )}
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
                          className={`
                            input-modern w-full
                            ${!ticketValidation.isValid && touched[`ticketTypes.${index}.price`]
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
                      {!ticketValidation.isValid && touched[`ticketTypes.${index}.price`] && (
                        <FieldValidation error={ticketValidation.errors.price} touched={true} />
                      )}
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
                          className={`
                            input-modern w-full
                            ${!ticketValidation.isValid && touched[`ticketTypes.${index}.quantity`]
                              ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                            }
                          `}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                      {!ticketValidation.isValid && touched[`ticketTypes.${index}.quantity`] && (
                        <FieldValidation error={ticketValidation.errors.quantity} touched={true} />
                      )}
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
                        rows={3}
                        className="input-modern w-full resize-none"
                        maxLength={500}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Optional: Describe what's included</span>
                        <span>{(ticket.description || '').length}/500</span>
                      </div>
                    </div>

                    {/* Sales Window */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sales Window
                        <span className="text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Sales Start
                          </label>
                          <div className="relative">
                            <input
                              type="datetime-local"
                              value={ticket.salesStart ? dateUtils.formatDateForInput(ticket.salesStart) : ''}
                              onChange={(e) => handleUpdateTicketType(index, 'salesStart', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="input-modern w-full"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Sales End
                          </label>
                          <div className="relative">
                            <input
                              type="datetime-local"
                              value={ticket.salesEnd ? dateUtils.formatDateForInput(ticket.salesEnd) : ''}
                              onChange={(e) => handleUpdateTicketType(index, 'salesEnd', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              min={ticket.salesStart ? dateUtils.formatDateForInput(ticket.salesStart) : undefined}
                              className="input-modern w-full"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Summary */}
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
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
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Section */}
        {ticketTypes.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Ticket Summary
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {ticketTypes.length}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Ticket Types
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {totalQuantity}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Total Tickets
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {currencyUtils.formatCurrency(totalRevenue, formData.pricing?.currency || 'USD')}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
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
                  Consider reducing ticket quantities or increasing capacity.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                Ticket Types Tips
              </h4>
              <ul className="text-sm text-indigo-800 dark:text-indigo-300 space-y-1">
                <li>• Create different tiers (General, VIP, Early Bird) to maximize revenue</li>
                <li>• Use sales windows to create urgency and drive early purchases</li>
                <li>• Consider offering student or group discounts</li>
                <li>• Make sure total ticket quantities don't exceed your venue capacity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketTypesStep;
