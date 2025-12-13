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

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onChange({ start: null, end: null });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selector Button - Apple Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group w-full px-4 py-3 text-left border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 flex items-center justify-between backdrop-blur-xl shadow-sm hover:shadow-md"
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium tracking-tight">{formatDateRange()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-all duration-300 ease-out ${isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-gray-600 dark:group-hover:text-gray-400'}`} />
      </button>

      {/* Dropdown - Apple Style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1] // Apple's signature easing
            }}
            className="absolute left-0 right-0 z-50 mt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-visible"
            style={{ minWidth: 'max-content' }}
          >
            <div className="p-5">
              {/* Preset Options - Apple Style */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Quick Select
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetSelect(preset)}
                      className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all duration-200 text-center border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50 whitespace-nowrap"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider - Apple Style */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-5" />

              {/* Custom Date Picker - Apple Style */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Custom Range
                </h4>

                <div className="space-y-4">
                  {/* Individual Date Inputs - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Start Date
                        </label>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-2 border border-gray-200/50 dark:border-gray-700/50">
                        <DatePicker
                          selected={startDate}
                          onChange={(date) => {
                            setStartDate(date);
                            if (date && endDate) {
                              onChange({
                                start: date.toISOString(),
                                end: endDate.toISOString()
                              });
                            } else if (date && !endDate) {
                              onChange({
                                start: date.toISOString(),
                                end: null
                              });
                            }
                          }}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          maxDate={endDate || new Date()}
                          inline
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          calendarClassName="apple-calendar"
                        />
                      </div>
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          End Date
                        </label>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-2 border border-gray-200/50 dark:border-gray-700/50">
                        <DatePicker
                          selected={endDate}
                          onChange={(date) => {
                            setEndDate(date);
                            if (startDate && date) {
                              onChange({
                                start: startDate.toISOString(),
                                end: date.toISOString()
                              });
                            } else if (!startDate && date) {
                              onChange({
                                start: null,
                                end: date.toISOString()
                              });
                            }
                          }}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate}
                          maxDate={new Date()}
                          inline
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          calendarClassName="apple-calendar"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Apple Style */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                    >
                      Clear
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => setIsOpen(false)}
                        disabled={!startDate && !endDate}
                        className="px-4 py-1.5 text-sm font-semibold bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md shadow-blue-500/25 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
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

      {/* Click outside to close - Apple Style */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DateRangePicker;


