import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const BulkResendHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });

      // Add filters if set
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', new Date(filters.endDate).toISOString());

      const response = await api.get(`/api/admin/bulk-resend-logs?${params.toString()}`);

      if (response.data?.success) {
        setLogs(response.data.data.logs || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination,
        }));
      } else {
        toast.error(response.data?.error || 'Failed to load history');
      }
    } catch (error) {
      console.error('Failed to fetch bulk resend logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => fetchLogs(), 100);
  };

  const toggleExpand = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Resend History
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View all bulk ticket resend operations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filters</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Send className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No bulk resend history found</p>
            <p className="text-sm">Try adjusting your filters or create a new bulk resend</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Triggered By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <React.Fragment key={log._id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-sm text-gray-900 dark:text-white">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(log.startTime)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.triggeredBy?.userName || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {log.triggeredBy?.userEmail || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {log.filters?.eventTitle || 'All Events'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.stats?.totalOrdersProcessed || 0} / {log.stats?.totalOrdersFound || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDuration(log.duration || (log.endTime && log.startTime ? new Date(log.endTime) - new Date(log.startTime) : null))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleExpand(log._id)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {expandedLogId === log._id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span>Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>Details</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedLogId === log._id && (
                        <tr>
                          <td colSpan="7" className="bg-gray-50 dark:bg-gray-900">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-6 py-4"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Statistics */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Statistics
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Orders Found:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalOrdersFound || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Orders Processed:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalOrdersProcessed || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Orders Skipped:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalOrdersSkipped || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Tickets Updated:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalTicketsUpdated || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Emails Sent:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalEmailsSent || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Email Retries:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {log.stats?.totalEmailRetries || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Errors:</span>
                                      <span className={`font-medium ${log.stats?.totalErrors > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {log.stats?.totalErrors || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Filters Applied */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Filters Applied
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Event:</span>
                                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                                        {log.filters?.eventTitle || 'All Events'}
                                      </p>
                                    </div>
                                    {log.filters?.startDate && (
                                      <div>
                                        <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                                        <p className="font-medium text-gray-900 dark:text-white mt-1">
                                          {new Date(log.filters.startDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                    {log.filters?.endDate && (
                                      <div>
                                        <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                                        <p className="font-medium text-gray-900 dark:text-white mt-1">
                                          {new Date(log.filters.endDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Execution Mode:</span>
                                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                                        {log.executionMode || 'synchronous'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Errors */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Errors {log.errors && log.errors.length > 0 && `(${log.errors.length})`}
                                  </h4>
                                  {log.errors && log.errors.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {log.errors.slice(0, 5).map((error, index) => (
                                        <div
                                          key={index}
                                          className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs"
                                        >
                                          <div className="font-medium text-red-900 dark:text-red-300">
                                            Order: {error.orderNumber || error.orderId || 'Unknown'}
                                          </div>
                                          <div className="text-red-700 dark:text-red-400 mt-1">
                                            {error.error || 'Unknown error'}
                                          </div>
                                        </div>
                                      ))}
                                      {log.errors.length > 5 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                                          ... and {log.errors.length - 5} more errors
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No errors reported
                                    </p>
                                  )}

                                  {log.error && (
                                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                                      <div className="font-medium text-red-900 dark:text-red-300">
                                        Job Failure:
                                      </div>
                                      <div className="text-red-700 dark:text-red-400 mt-1">
                                        {log.error}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev || loading}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext || loading}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkResendHistory;
