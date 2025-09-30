import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileCode,
  Filter,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { createExportJob, exportAttendees } from '../../store/slices/analyticsSlice';

const AttendeeExport = ({ eventId, eventTitle, loading, error }) => {
  const dispatch = useDispatch();
  const { exportJobs, exportLoading } = useSelector(state => state.analytics);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [filters, setFilters] = useState({
    status: 'all',
    ticketType: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedFields, setSelectedFields] = useState([
    'ticketNumber',
    'holder.firstName',
    'holder.lastName',
    'holder.email',
    'ticketType',
    'price',
    'orderNumber',
    'purchaseDate',
    'status'
  ]);

  const exportFormats = [
    { id: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel format' },
    { id: 'pdf', label: 'PDF', icon: FileImage, description: 'Portable Document Format' },
    { id: 'json', label: 'JSON', icon: FileCode, description: 'JavaScript Object Notation' }
  ];

  const availableFields = [
    { id: 'ticketNumber', label: 'Ticket Number', required: true },
    { id: 'holder.firstName', label: 'First Name', required: true },
    { id: 'holder.lastName', label: 'Last Name', required: true },
    { id: 'holder.email', label: 'Email', required: true },
    { id: 'holder.phone', label: 'Phone Number' },
    { id: 'ticketType', label: 'Ticket Type', required: true },
    { id: 'price', label: 'Price', required: true },
    { id: 'orderNumber', label: 'Order Number' },
    { id: 'purchaseDate', label: 'Purchase Date' },
    { id: 'paymentMethod', label: 'Payment Method' },
    { id: 'status', label: 'Status', required: true },
    { id: 'usedAt', label: 'Used At' },
    { id: 'event.title', label: 'Event Title' },
    { id: 'event.dates.startDate', label: 'Event Date' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'used', label: 'Used' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' }
  ];

  const ticketTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'VIP', label: 'VIP' },
    { value: 'General', label: 'General' },
    { value: 'Early Bird', label: 'Early Bird' },
    { value: 'Student', label: 'Student' },
    { value: 'Group', label: 'Group' }
  ];

  const handleExport = useCallback(async () => {
    if (!eventId) {
      toast.error('Please select an event first');
      return;
    }

    const exportOptions = {
      format: exportFormat,
      fields: selectedFields,
      ...filters
    };

    try {
      // For large exports, create a job
      if (exportFormat === 'excel' || exportFormat === 'pdf') {
        await dispatch(createExportJob({ eventId, options: exportOptions }));
        toast.success('Export job created. You will be notified when ready.');
      } else {
        // For small exports, direct download
        await dispatch(exportAttendees({ eventId, options: exportOptions }));
        toast.success('Export completed successfully');
      }
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    }
  }, [eventId, exportFormat, selectedFields, filters, dispatch]);

  const handleFieldToggle = (fieldId) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.required) return; // Don't allow toggling required fields

    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFields.map(f => f.id));
  };

  const handleDeselectAllFields = () => {
    setSelectedFields(availableFields.filter(f => f.required).map(f => f.id));
  };

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getJobStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!eventId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select an Event
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose an event from the dropdown above to export attendee data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Attendee Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Export attendee information for <strong>{eventTitle}</strong>
            </p>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Advanced</span>
            {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Export Format
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exportFormats.map((format) => {
              const Icon = format.icon;
              return (
                <motion.button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`p-4 rounded-lg border transition-colors ${
                    exportFormat === format.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {format.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status Filter
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ticket Type Filter
            </label>
            <select
              value={filters.ticketType}
              onChange={(e) => setFilters(prev => ({ ...prev, ticketType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ticketTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200 dark:border-gray-700 pt-6"
            >
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Select Fields to Export
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSelectAllFields}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={handleDeselectAllFields}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Required Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableFields.map((field) => (
                    <label
                      key={field.id}
                      className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        field.required
                          ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60'
                          : selectedFields.includes(field.id)
                          ? 'bg-blue-100 dark:bg-blue-900/20'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                        disabled={field.required}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Button */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFields.length} fields selected
          </div>
          
          <button
            onClick={handleExport}
            disabled={exportLoading || !selectedFields.length}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            <span>
              {exportLoading ? 'Exporting...' : 'Export Data'}
            </span>
          </button>
        </div>
      </div>

      {/* Export Jobs */}
      {exportJobs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Export Jobs
          </h3>
          
          <div className="space-y-3">
            {exportJobs.map((job) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getJobStatusIcon(job.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.format.toUpperCase()} Export
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  
                  {job.status === 'completed' && (
                    <a
                      href={job.downloadUrl}
                      download
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
              Privacy Notice
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Exported data contains personal information. Please ensure you comply with 
              data protection regulations and only share with authorized personnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendeeExport;


