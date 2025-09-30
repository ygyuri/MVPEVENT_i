import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  ChevronDown,
  Search,
  Filter,
  CheckCircle,
  Clock
} from 'lucide-react';

const EventSelector = ({ events, selectedEvent, onEventSelect, loading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter events based on search and status
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location?.city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleEventSelect = (event) => {
    onEventSelect(event);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div>
            {selectedEvent ? (
              <div>
                <p className="font-medium">{selectedEvent.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(selectedEvent.dates?.startDate)}
                </p>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                Select an event...
              </span>
            )}
          </div>
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
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden"
          >
            {/* Search and Filter */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Events List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <motion.button
                    key={event._id}
                    onClick={() => handleEventSelect(event)}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {event.title}
                          </h4>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {getStatusIcon(event.status)}
                            <span>{event.status}</span>
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {event.dates?.startDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(event.dates.startDate)}
                            </p>
                          )}
                          
                          {event.location?.city && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {event.location.city}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            {event.capacity && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{event.currentAttendees || 0}/{event.capacity}</span>
                              </div>
                            )}
                            
                            {event.pricing?.price && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCurrency(event.pricing.price)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No events match your search criteria'
                      : 'No events available'
                    }
                  </p>
                </div>
              )}
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

export default EventSelector;


