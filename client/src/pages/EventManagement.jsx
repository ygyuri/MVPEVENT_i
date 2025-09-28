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
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import EventList from '../components/organizer/EventList';
import EventActions from '../components/organizer/EventActions';
import EnhancedButton from '../components/EnhancedButton';
import { 
  fetchMyEvents, 
  deleteEvent, 
  cloneEvent,
  cancelEvent,
  unpublishEvent
} from '../store/slices/organizerSlice';
import { dateUtils } from '../utils/eventHelpers';

const EventManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useSelector(state => state.auth);
  const { events, loading, error, meta } = useSelector(state => state.organizer);
  
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
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    
    // Prevent duplicate calls within 2 seconds unless forced
    if (!forceRefresh && timeSinceLastFetch < 2000) {
      console.log('🚫 [DASHBOARD] Preventing duplicate API call (too soon)');
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
    
    console.log('🔄 [DASHBOARD] Fetching events data:', { params, forceRefresh, timeSinceLastFetch });
    setLastFetchTime(now);
    await dispatch(fetchMyEvents(params));
  }, [dispatch, currentPage, sortBy, sortOrder, debouncedSearch, filters, lastFetchTime]);
  
  // Single useEffect for initial load and filter changes
  useEffect(() => {
    fetchEventsData();
  }, [fetchEventsData]);

  // Refresh data when user returns to dashboard (focus/visibility events)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 [DASHBOARD] Page focused - refreshing events data');
      fetchEventsData(true); // Force refresh on focus
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 [DASHBOARD] Page visible - refreshing events data');
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
  
  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.location?.venueName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(event => event.status === filters.status);
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
          await dispatch(cloneEvent(eventId)).unwrap();
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
          
        case 'view':
          navigate(`/events/${eventData.slug}`);
          break;
          
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Event action failed:', error);
      toast.error(`Failed to ${action} event: ${error.message || 'Unknown error'}`);
    }
  }, [dispatch, navigate]);
  
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events by title, description, or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-10 w-full"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters(prev => ({ ...prev, status: option.value }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                  filters.status === option.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
                <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
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
        loading={loading}
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
      {meta && meta.totalPages > 1 && (
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
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
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
              onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
              disabled={currentPage === meta.totalPages}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;
