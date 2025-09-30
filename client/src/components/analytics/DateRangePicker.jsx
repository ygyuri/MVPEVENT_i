import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronDown,
  Clock,
  CalendarDays
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateRangePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(value?.start ? new Date(value.start) : null);
  const [endDate, setEndDate] = useState(value?.end ? new Date(value.end) : null);

  // Preset date ranges
  const presets = [
    {
      label: 'Last 7 days',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { start, end };
      }
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { start, end };
      }
    },
    {
      label: 'Last 3 months',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        return { start, end };
      }
    },
    {
      label: 'Last 6 months',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        return { start, end };
      }
    },
    {
      label: 'This year',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(0, 1); // January 1st
        return { start, end };
      }
    },
    {
      label: 'All time',
      getValue: () => {
        const end = new Date();
        const start = new Date('2020-01-01'); // Arbitrary start date
        return { start, end };
      }
    }
  ];

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Select date range...';
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) return `From ${formatDate(startDate)}`;
    if (endDate) return `Until ${formatDate(endDate)}`;
    return 'Select date range...';
  };

  const handlePresetSelect = (preset) => {
    const { start, end } = preset.getValue();
    setStartDate(start);
    setEndDate(end);
    onChange({ start: start.toISOString(), end: end.toISOString() });
    setIsOpen(false);
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    
    if (start && end) {
      onChange({ 
        start: start.toISOString(), 
        end: end.toISOString() 
      });
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onChange({ start: null, end: null });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-sm">{formatDateRange()}</span>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            <div className="p-4">
              {/* Preset Options */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Quick Select
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetSelect(preset)}
                      className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Picker */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Custom Range
                </h4>
                
                <div className="space-y-3">
                  {/* Date Range Picker */}
                  <div className="relative">
                    <DatePicker
                      selected={startDate}
                      onChange={handleDateChange}
                      startDate={startDate}
                      endDate={endDate}
                      selectsRange
                      inline
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      maxDate={new Date()}
                      className="w-full"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleClear}
                      className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      
                      <button
                        onClick={() => setIsOpen(false)}
                        disabled={!startDate || !endDate}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DateRangePicker;


