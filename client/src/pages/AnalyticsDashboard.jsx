import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Calendar,
  Filter,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Analytics components
import SalesChart from '../components/analytics/SalesChart';
import RevenueOverview from '../components/analytics/RevenueOverview';
import AttendeeExport from '../components/analytics/AttendeeExport';
import EventSelector from '../components/analytics/EventSelector';
import DateRangePicker from '../components/analytics/DateRangePicker';
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';
import PollAnalyticsDashboard from '../components/organizer/PollAnalyticsDashboard'

// Redux actions
import {
  fetchDashboardOverview,
  fetchSalesChart,
  fetchRevenueOverview,
  setSelectedEvent,
  setDateRange,
  setPeriod,
  setFilters,
  clearAnalyticsError,
  updateLastUpdated
} from '../store/slices/analyticsSlice';
import { fetchMyEvents } from '../store/slices/organizerSlice';

const AnalyticsDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { events } = useSelector(state => state.organizer);
  
  const {
    dashboardData,
    dashboardLoading,
    dashboardError,
    salesChartData,
    salesChartLoading,
    salesChartError,
    revenueData,
    revenueLoading,
    revenueError,
    selectedEvent,
    dateRange,
    period,
    filters,
    lastUpdated
  } = useSelector(state => state.analytics);

  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, 30000); // 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  // Load dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboardOverview());
  }, [dispatch]);

  // Ensure organizer events are loaded for the dropdown
  useEffect(() => {
    if (!events || events.length === 0) {
      dispatch(fetchMyEvents({ page: 1, pageSize: 50 }));
    }
  }, [dispatch, events]);

  // Load analytics data when event or filters change
  useEffect(() => {
    if (selectedEvent) {
      loadAnalyticsData();
    }
  }, [selectedEvent, dateRange, period, filters]);

  // Error handling
  useEffect(() => {
    if (dashboardError) {
      toast.error(`Dashboard Error: ${dashboardError}`);
      dispatch(clearAnalyticsError());
    }
    if (salesChartError) {
      toast.error(`Sales Chart Error: ${salesChartError}`);
      dispatch(clearAnalyticsError());
    }
    if (revenueError) {
      toast.error(`Revenue Error: ${revenueError}`);
      dispatch(clearAnalyticsError());
    }
  }, [dashboardError, salesChartError, revenueError, dispatch]);

  const loadAnalyticsData = useCallback(() => {
    if (!selectedEvent) return;

    const options = {
      period,
      startDate: dateRange.start,
      endDate: dateRange.end,
      ...filters
    };

    dispatch(fetchSalesChart({ eventId: selectedEvent._id, options }));
    dispatch(fetchRevenueOverview({ eventId: selectedEvent._id }));
  }, [selectedEvent, period, dateRange, filters, dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchDashboardOverview());
    if (selectedEvent) {
      loadAnalyticsData();
    }
    dispatch(updateLastUpdated());
    toast.success('Data refreshed');
  }, [dispatch, selectedEvent, loadAnalyticsData]);

  const handleEventSelect = useCallback((event) => {
    dispatch(setSelectedEvent(event));
    try {
      if (event?._id) {
        localStorage.setItem('analyticsSelectedEventId', event._id);
      }
    } catch (_) {}
    toast.success(`Analytics loaded for ${event.title}`);
  }, [dispatch]);

  const handleDateRangeChange = useCallback((range) => {
    dispatch(setDateRange(range));
  }, [dispatch]);

  const handlePeriodChange = useCallback((newPeriod) => {
    dispatch(setPeriod(newPeriod));
  }, [dispatch]);

  const handleFiltersChange = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  // Restore selected event after refresh if available in localStorage
  useEffect(() => {
    if (selectedEvent || !events || events.length === 0) return;
    try {
      const savedId = localStorage.getItem('analyticsSelectedEventId');
      if (savedId) {
        const match = events.find(e => e._id === savedId);
        if (match) {
          dispatch(setSelectedEvent(match));
        }
      }
    } catch (_) {}
  }, [dispatch, events, selectedEvent]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sales', label: 'Sales Chart', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'polls', label: 'Polls', icon: TrendingUp }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lastUpdated && `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>Auto-refresh</span>
              </button>
              
              {/* Manual refresh */}
              <button
                onClick={handleRefresh}
                disabled={dashboardLoading}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selector and Controls */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Event
                </label>
                <EventSelector
                  events={events}
                  selectedEvent={selectedEvent}
                  onEventSelect={handleEventSelect}
                />
              </div>

              {/* Date Range Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>

              {/* Period Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period
                </label>
                <select
                  value={period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Filters Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <AnalyticsFilters
                    filters={filters}
                    onChange={handleFiltersChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dashboard Overview */}
        {dashboardData && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Events Count */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(dashboardData.eventsCount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(dashboardData.totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tickets Sold */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets Sold</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(dashboardData.totalTicketsSold)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Events</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(dashboardData.upcomingEvents?.length || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {selectedEvent ? (
                  <>
                    <SalesChart
                      data={salesChartData}
                      loading={salesChartLoading}
                      error={salesChartError}
                      period={period}
                      onPeriodChange={handlePeriodChange}
                    />
                    <RevenueOverview
                      data={revenueData}
                      loading={revenueLoading}
                      error={revenueError}
                    />
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Select an Event
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Choose an event from the dropdown above to view detailed analytics.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sales' && (
              <SalesChart
                data={salesChartData}
                loading={salesChartLoading}
                error={salesChartError}
                period={period}
                onPeriodChange={handlePeriodChange}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueOverview
                data={revenueData}
                loading={revenueLoading}
                error={revenueError}
              />
            )}

            {activeTab === 'export' && (
              <AttendeeExport
                eventId={selectedEvent?._id}
                eventTitle={selectedEvent?.title}
                loading={false}
                error={null}
              />
            )}

            {activeTab === 'polls' && selectedEvent && (
              <PollAnalyticsDashboard eventId={selectedEvent._id} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;


