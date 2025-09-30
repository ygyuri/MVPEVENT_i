import React from 'react';
import { motion } from 'framer-motion';
import { 
  Filter,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Users
} from 'lucide-react';

const AnalyticsFilters = ({ filters, onChange }) => {
  const filterOptions = {
    ticketType: [
      { value: 'all', label: 'All Types' },
      { value: 'VIP', label: 'VIP' },
      { value: 'General', label: 'General' },
      { value: 'Early Bird', label: 'Early Bird' },
      { value: 'Student', label: 'Student' },
      { value: 'Group', label: 'Group' }
    ],
    paymentMethod: [
      { value: 'all', label: 'All Methods' },
      { value: 'mpesa', label: 'MPESA' },
      { value: 'pesapal', label: 'PesaPal' },
      { value: 'payhero', label: 'PayHero' },
      { value: 'card', label: 'Card' }
    ],
    status: [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active', icon: CheckCircle, color: 'green' },
      { value: 'used', label: 'Used', icon: CheckCircle, color: 'blue' },
      { value: 'cancelled', label: 'Cancelled', icon: X, color: 'red' },
      { value: 'refunded', label: 'Refunded', icon: AlertCircle, color: 'orange' }
    ]
  };

  const handleFilterChange = (filterType, value) => {
    onChange({ [filterType]: value });
  };

  const getStatusIcon = (option) => {
    if (!option.icon) return null;
    const Icon = option.icon;
    const colorClasses = {
      green: 'text-green-500',
      blue: 'text-blue-500',
      red: 'text-red-500',
      orange: 'text-orange-500'
    };
    
    return (
      <Icon className={`h-4 w-4 ${colorClasses[option.color] || 'text-gray-500'}`} />
    );
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'mpesa':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'pesapal':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'payhero':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-gray-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTicketTypeIcon = (type) => {
    switch (type) {
      case 'VIP':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'General':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'Early Bird':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'Student':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'Group':
        return <Users className="h-4 w-4 text-indigo-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderFilterGroup = (title, filterType, options) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <span>{title}</span>
      </h4>
      
      <div className="space-y-2">
        {options.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => handleFilterChange(filterType, option.value)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters[filterType] === option.value
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-2">
              {filterType === 'status' && getStatusIcon(option)}
              {filterType === 'paymentMethod' && getPaymentMethodIcon(option.value)}
              {filterType === 'ticketType' && getTicketTypeIcon(option.value)}
              <span>{option.label}</span>
            </div>
            
            {filters[filterType] === option.value && (
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== 'all');
  };

  const clearAllFilters = () => {
    onChange({
      ticketType: 'all',
      paymentMethod: 'all',
      status: 'all'
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Analytics Filters
        </h3>
        
        {hasActiveFilters() && (
          <button
            onClick={clearAllFilters}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
            Active Filters:
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.ticketType !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                <Users className="h-3 w-3" />
                <span>{filters.ticketType}</span>
              </span>
            )}
            {filters.paymentMethod !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                <CreditCard className="h-3 w-3" />
                <span>{filters.paymentMethod}</span>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                <span>{filters.status}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderFilterGroup('Ticket Type', 'ticketType', filterOptions.ticketType)}
        {renderFilterGroup('Payment Method', 'paymentMethod', filterOptions.paymentMethod)}
        {renderFilterGroup('Ticket Status', 'status', filterOptions.status)}
      </div>

      {/* Filter Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Filter Information
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Filters are applied in real-time to all analytics data. Changes will automatically 
              update charts and metrics. Use filters to focus on specific segments of your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilters;


