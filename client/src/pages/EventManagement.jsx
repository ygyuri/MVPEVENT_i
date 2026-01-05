import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Users, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  MoreVertical,
  ChevronDown,
  SortAsc,
  SortDesc,
  RefreshCw,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import EventList from '../components/organizer/EventList';
import DateRangePicker from '../components/analytics/DateRangePicker';
import EventActions from '../components/organizer/EventActions';
import EnhancedButton from '../components/EnhancedButton';
import { 
  fetchMyEvents, 
  deleteEvent, 
  cloneEvent,
  cancelEvent,
  unpublishEvent,
  publishEvent
} from '../store/slices/organizerSlice';
import { setSelectedEvent } from '../store/slices/analyticsSlice';
import { dateUtils } from '../utils/eventHelpers';

const EventManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const { events, loading, error, eventsPagination } = useSelector(state => state.organizer);
  
  // Local state for filtering and sorting
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateRange: 'all'
  });
  
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [showBulkResendModal, setShowBulkResendModal] = useState(false);
  const [bulkResendEventId, setBulkResendEventId] = useState(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [bulkResendStats, setBulkResendStats] = useState(null);
  const [bulkResendDateRange, setBulkResendDateRange] = useState({ start: null, end: null });
  const [bulkResendPreview, setBulkResendPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  
  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Optimized fetch function to prevent duplicate calls
  const fetchEventsData = useCallback(async (forceRefresh = false) => {
    // Gate on auth and role to avoid 401s and redundant calls
    if (authLoading || !isAuthenticated || !user || user.role !== 'organizer') {
      return;
    }
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    
    // Prevent duplicate calls within 2 seconds unless forced
    if (!forceRefresh && timeSinceLastFetch < 2000) {
      // console.log('🚫 [DASHBOARD] Preventing duplicate API call (too soon)');
      return;
    }

    const params = {
      page: currentPage,
      pageSize: 12,
      sort: sortBy,
      order: sortOrder,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.dateRange !== 'all' && { dateRange: filters.dateRange })
    };
    
    // console.log('🔄 [DASHBOARD] Fetching events data:', { params, forceRefresh, timeSinceLastFetch });
    setLastFetchTime(now);
    await dispatch(fetchMyEvents(params));
  }, [dispatch, currentPage, sortBy, sortOrder, debouncedSearch, filters, lastFetchTime, authLoading, isAuthenticated, user]);
  
  // Single useEffect for initial load and filter changes
  useEffect(() => {
    // console.log('🔄 [EVENT MANAGEMENT] useEffect triggered', {
    //   authLoading,
    //   isAuthenticated,
    //   user: user?.email,
    //   role: user?.role
    // });
    fetchEventsData();
  }, [fetchEventsData, authLoading, isAuthenticated, user]);

  // Refresh data when user returns to dashboard (focus/visibility events)
  useEffect(() => {
    const handleFocus = () => {
      // console.log('🔄 [DASHBOARD] Page focused - refreshing events data');
      fetchEventsData(true); // Force refresh on focus
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // console.log('🔄 [DASHBOARD] Page visible - refreshing events data');
        fetchEventsData(true); // Force refresh on visibility change
      }
    };

    // Add event listeners
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchEventsData]);

  // Refresh data when navigating back to this page
  useEffect(() => {
    const handlePopState = () => {
      console.log('🔄 [DASHBOARD] Navigation back - refreshing events data');
      fetchEventsData(true); // Force refresh on navigation back
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchEventsData]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('🔄 [DASHBOARD] Manual refresh triggered');
    
    try {
      await fetchEventsData(true); // Force refresh
      toast.success('Events refreshed successfully!');
    } catch (error) {
      console.error('❌ [DASHBOARD] Refresh failed:', error);
      toast.error('Failed to refresh events');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchEventsData]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    // console.log('📊 [EVENT MANAGEMENT] Total events in state:', events.length);
    // console.log('📊 [EVENT MANAGEMENT] Events:', events);
    
    let filtered = [...events];
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.venueName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(event => event.status === filters.status);
      console.log(`🔍 [EVENT MANAGEMENT] Filtered by status '${filters.status}':`, filtered.length);
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.dates?.startDate);
        switch (filters.dateRange) {
          case 'upcoming':
            return eventDate > now;
          case 'past':
            return eventDate < now;
          case 'thisWeek':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return eventDate > now && eventDate < weekFromNow;
          case 'thisMonth':
            const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return eventDate > now && eventDate < monthFromNow;
          default:
            return true;
        }
      });
    }
    
    // console.log('📊 [EVENT MANAGEMENT] Filtered events:', filtered.length);
    
    return filtered;
  }, [events, debouncedSearch, filters]);
  
  // Handle event actions
  const handleEventAction = useCallback(async (action, eventId, eventData = {}) => {
    try {
      switch (action) {
        case 'edit':
          navigate(`/organizer/events/${eventId}/edit`);
          break;
          
        case 'clone':
          await dispatch(cloneEvent({ eventId })).unwrap();
          toast.success('Event cloned successfully!');
          break;
          
        case 'delete':
          if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            await dispatch(deleteEvent(eventId)).unwrap();
            toast.success('Event deleted successfully!');
          }
          break;
          
        case 'cancel':
          if (window.confirm('Are you sure you want to cancel this event?')) {
            await dispatch(cancelEvent(eventId)).unwrap();
            toast.success('Event cancelled successfully!');
          }
          break;
          
        case 'unpublish':
          if (window.confirm('Are you sure you want to unpublish this event?')) {
            await dispatch(unpublishEvent(eventId)).unwrap();
            toast.success('Event unpublished successfully!');
          }
          break;

        case 'publish':
          await dispatch(publishEvent(eventId)).unwrap();
          toast.success('Event published successfully!');
          break;

        case 'analytics':
          if (eventData) {
            dispatch(setSelectedEvent(eventData));
          }
          navigate('/organizer/analytics');
          break;
          
        case 'view':
          navigate(`/events/${eventData.slug}`);
          break;

        case 'bulk-resend':
          setBulkResendEventId(eventId);
          setShowBulkResendModal(true);
          break;
          
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Event action failed:', error);
      toast.error(`Failed to ${action} event: ${error.message || 'Unknown error'}`);
    }
  }, [dispatch, navigate]);
  
  // Handle load preview
  const handleLoadPreview = useCallback(async (page = 1) => {
    if (!bulkResendEventId) {
      toast.error('No event selected');
      return;
    }

    try {
      setLoadingPreview(true);

      const params = new URLSearchParams();
      params.append('eventId', bulkResendEventId);
      if (bulkResendDateRange.start) {
        params.append('startDate', bulkResendDateRange.start);
      }
      if (bulkResendDateRange.end) {
        params.append('endDate', bulkResendDateRange.end);
      }
      params.append('page', page.toString());
      params.append('limit', '20');

      const response = await api.get(
        `/api/organizer/tickets/bulk-resend/preview?${params.toString()}`
      );

      if (response.data?.success) {
        setBulkResendPreview(response.data.data);
        setPreviewPage(page);
        toast.success('Preview loaded successfully!');
      } else {
        toast.error(response.data?.error || 'Failed to load preview');
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load preview'
      );
    } finally {
      setLoadingPreview(false);
    }
  }, [bulkResendEventId, bulkResendDateRange]);

  // Handle bulk resend tickets
  const handleBulkResend = useCallback(async () => {
    if (!bulkResendEventId) {
      toast.error('No event selected');
      return;
    }

    // Require preview before execution
    if (!bulkResendPreview) {
      toast.error('Please load preview before executing bulk resend');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to bulk resend tickets with updated QR codes for this event?\n\n` +
        `This will:\n` +
        `- Process ${bulkResendPreview.summary.totalOrders} orders\n` +
        `- Regenerate QR codes for ${bulkResendPreview.summary.totalTickets} tickets\n` +
        `- Update QR codes in the database\n` +
        `- Send updated ticket emails to all attendees\n\n` +
        `Estimated duration: ${bulkResendPreview.summary.estimatedDuration}\n\n` +
        `This operation may take several minutes. Continue?`
      )
    ) {
      return;
    }

    try {
      setBulkResending(true);
      setBulkResendStats(null);

      const params = new URLSearchParams();
      params.append('eventId', bulkResendEventId);
      if (bulkResendDateRange.start) {
        params.append('startDate', bulkResendDateRange.start);
      }
      if (bulkResendDateRange.end) {
        params.append('endDate', bulkResendDateRange.end);
      }

      const response = await api.post(
        `/api/organizer/tickets/bulk-resend?${params.toString()}`
      );

      if (response.data?.success) {
        const stats = response.data.data;
        setBulkResendStats(stats);
        toast.success(
          `Bulk resend completed! Processed ${stats.totalOrdersProcessed} orders, updated ${stats.totalTicketsUpdated} tickets, sent ${stats.totalEmailsSent} emails.`
        );
        if (stats.totalErrors > 0) {
          toast.error(`${stats.totalErrors} errors occurred. Check console for details.`);
        }
      } else {
        toast.error(response.data?.error || 'Failed to process bulk resend');
      }
    } catch (err) {
      console.error('Failed to bulk resend tickets:', err);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to process bulk resend'
      );
    } finally {
      setBulkResending(false);
    }
  }, [bulkResendEventId, bulkResendDateRange, bulkResendPreview]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action) => {
    if (selectedEvents.length === 0) {
      toast.error('Please select events first');
      return;
    }
    
    try {
      const promises = selectedEvents.map(eventId => {
        switch (action) {
          case 'delete':
            return dispatch(deleteEvent(eventId)).unwrap();
          case 'cancel':
            return dispatch(cancelEvent(eventId)).unwrap();
          case 'unpublish':
            return dispatch(unpublishEvent(eventId)).unwrap();
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      setSelectedEvents([]);
      toast.success(`${selectedEvents.length} events ${action}ed successfully!`);
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error(`Failed to ${action} events: ${error.message || 'Unknown error'}`);
    }
  }, [dispatch, selectedEvents]);
  
  // Handle sort change
  const handleSortChange = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);
  
  // Handle event selection
  const handleEventSelect = useCallback((eventId, selected) => {
    if (selected) {
      setSelectedEvents(prev => [...prev, eventId]);
    } else {
      setSelectedEvents(prev => prev.filter(id => id !== eventId));
    }
  }, []);
  
  // Handle select all
  const handleSelectAll = useCallback((selected) => {
    if (selected) {
      setSelectedEvents(filteredEvents.map(event => event._id));
    } else {
      setSelectedEvents([]);
    }
  }, [filteredEvents]);
  
  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'All Events', count: events.length },
    { value: 'draft', label: 'Drafts', count: events.filter(e => e.status === 'draft').length },
    { value: 'published', label: 'Published', count: events.filter(e => e.status === 'published').length },
    { value: 'cancelled', label: 'Cancelled', count: events.filter(e => e.status === 'cancelled').length },
    { value: 'completed', label: 'Completed', count: events.filter(e => e.status === 'completed').length }
  ];
  
  // Date range filter options
  const dateRangeOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' }
  ];
  
  // Sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'title', label: 'Title' },
    { value: 'startDate', label: 'Event Date' },
    { value: 'status', label: 'Status' },
    { value: 'capacity', label: 'Capacity' }
  ];

  // Show loading state while authentication is in progress
  if (authLoading || !isAuthenticated) {
    return (
      <div className="container-modern">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if user is not an organizer
  if (user && user.role !== 'organizer') {
    return (
      <div className="container-modern">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You need organizer privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container-modern">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Event Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your events, track performance, and handle event operations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <EnhancedButton
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              icon={Filter}
              className="hidden sm:flex"
            >
              Filters
            </EnhancedButton>
            
            <EnhancedButton
              variant="secondary"
              onClick={handleRefresh}
              icon={RefreshCw}
              disabled={isRefreshing}
              className={`btn-web3-secondary ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </EnhancedButton>
            
            <EnhancedButton
              variant="primary"
              onClick={() => navigate('/organizer/events/create')}
              icon={Plus}
              className="btn-web3-primary"
            >
              Create Event
            </EnhancedButton>
          </div>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events by title, description, or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-12 w-full"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap overflow-x-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters(prev => ({ ...prev, status: option.value }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 inline-flex items-center gap-2 ${
                  filters.status === option.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="truncate max-w-[8rem]">{option.label}</span>
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs shrink-0">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="input-modern w-full"
                  >
                    {dateRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="input-modern flex-1"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Bulk Actions */}
                {selectedEvents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bulk Actions ({selectedEvents.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkAction('delete')}
                        className="px-3 py-2 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors duration-200"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleBulkAction('cancel')}
                        className="px-3 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-lg text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Event List */}
      <EventList
        events={filteredEvents}
        loading={loading?.events}
        error={error}
        onEventAction={handleEventAction}
        onEventSelect={handleEventSelect}
        onSelectAll={handleSelectAll}
        selectedEvents={selectedEvents}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
      
      {/* Pagination */}
      {eventsPagination && eventsPagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, eventsPagination.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === page
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(eventsPagination.totalPages, prev + 1))}
              disabled={currentPage === eventsPagination.totalPages}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bulk Resend Modal */}
      {showBulkResendModal && bulkResendEventId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-6 h-6 text-[#4f0f69]" />
                  Bulk Resend Tickets
                </h2>
                <button
                  onClick={() => {
                    setShowBulkResendModal(false);
                    setBulkResendStats(null);
                    setBulkResendEventId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {!bulkResendStats ? (
                <>
                  <div className="mb-6">
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      This will regenerate QR codes and resend tickets to all attendees with
                      paid/completed orders for this event. The updated QR codes will be saved to the database.
                    </p>

                    {filteredEvents.find(e => e._id === bulkResendEventId) && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Event: {filteredEvents.find(e => e._id === bulkResendEventId)?.title}
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date Range (Optional)
                      </label>
                      <DateRangePicker
                        value={bulkResendDateRange}
                        onChange={(range) => {
                          setBulkResendDateRange(range);
                          setBulkResendPreview(null); // Clear preview when date range changes
                        }}
                      />
                    </div>

                    {!bulkResendPreview ? (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                Preview Required
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                You must preview the orders before executing bulk resend. This helps prevent
                                accidental mass emails.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setShowBulkResendModal(false);
                              setBulkResendEventId(null);
                              setBulkResendDateRange({ start: null, end: null });
                              setBulkResendPreview(null);
                            }}
                            disabled={loadingPreview}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleLoadPreview(1)}
                            disabled={loadingPreview}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loadingPreview ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Loading Preview...
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Load Preview
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Preview Summary */}
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                                Preview Loaded
                              </p>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-green-600 dark:text-green-400">Orders</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {bulkResendPreview.summary.totalOrders}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-green-600 dark:text-green-400">Tickets</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {bulkResendPreview.summary.totalTickets}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-green-600 dark:text-green-400">Est. Time</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {bulkResendPreview.summary.estimatedDuration}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleLoadPreview(previewPage)}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Preview List */}
                        <div className="mb-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Order #
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Customer
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Email
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Tickets
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {bulkResendPreview.orders.map((order, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                                    {order.orderNumber}
                                  </td>
                                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                                    {order.customerName}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                                    {order.customerEmail}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-900 dark:text-white">
                                    {order.ticketCount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {bulkResendPreview.pagination.pages > 1 && (
                          <div className="flex items-center justify-between mb-4 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                              Page {bulkResendPreview.pagination.page} of {bulkResendPreview.pagination.pages}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleLoadPreview(previewPage - 1)}
                                disabled={previewPage === 1 || loadingPreview}
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => handleLoadPreview(previewPage + 1)}
                                disabled={previewPage === bulkResendPreview.pagination.pages || loadingPreview}
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                Important:
                              </p>
                              <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-1 list-disc list-inside">
                                <li>This will regenerate QR codes for all shown orders</li>
                                <li>Updated QR codes will be saved to the database</li>
                                <li>Emails will be sent to all attendees</li>
                                <li>This operation cannot be undone</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setShowBulkResendModal(false);
                              setBulkResendEventId(null);
                              setBulkResendDateRange({ start: null, end: null });
                              setBulkResendPreview(null);
                            }}
                            disabled={bulkResending}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleBulkResend}
                            disabled={bulkResending || !bulkResendPreview}
                            className="px-6 py-2 bg-[#4f0f69] text-white rounded-lg hover:bg-[#6b1589] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {bulkResending ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                Execute Bulk Resend
                              </>
                            )}
                    </button>
                  </div>
                </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Bulk Resend Completed
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-600 dark:text-blue-400">Orders Processed</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {bulkResendStats.totalOrdersProcessed}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          of {bulkResendStats.totalOrdersFound} found
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm text-green-600 dark:text-green-400">Tickets Updated</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {bulkResendStats.totalTicketsUpdated}
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <p className="text-sm text-purple-600 dark:text-purple-400">Emails Sent</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {bulkResendStats.totalEmailsSent}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {bulkResendStats.totalErrors}
                        </p>
                      </div>
                    </div>

                    {bulkResendStats.totalErrors > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                          Errors occurred:
                        </p>
                        <div className="max-h-32 overflow-y-auto">
                          {bulkResendStats.errors.slice(0, 5).map((error, idx) => (
                            <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                              {error.orderNumber || error.orderId}: {error.error}
                            </p>
                          ))}
                          {bulkResendStats.errors.length > 5 && (
                            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                              ... and {bulkResendStats.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {bulkResendStats.endTime && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Completed in{" "}
                        {(
                          (new Date(bulkResendStats.endTime) -
                            new Date(bulkResendStats.startTime)) /
                          1000
                        ).toFixed(2)}{" "}
                        seconds
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        setShowBulkResendModal(false);
                        setBulkResendStats(null);
                        setBulkResendEventId(null);
                      }}
                      className="px-6 py-2 bg-[#4f0f69] text-white rounded-lg hover:bg-[#6b1589] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;
