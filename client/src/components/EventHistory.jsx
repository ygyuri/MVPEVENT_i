import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Ticket, 
  Download,
  Eye,
  Star,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const EventHistory = () => {
  const { isDarkMode } = useTheme();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    dateRange: 'all'
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockEvents = [
      {
        id: 1,
        title: 'Tech Conference 2024',
        date: '2024-12-15',
        time: '09:00',
        location: 'San Francisco, CA',
        category: 'Technology',
        status: 'upcoming',
        tickets: 2,
        totalAmount: 299.98,
        image: '/api/placeholder/300/200',
        description: 'Annual technology conference featuring the latest innovations'
      },
      {
        id: 2,
        title: 'Music Festival',
        date: '2024-11-20',
        time: '18:00',
        location: 'Los Angeles, CA',
        category: 'Music',
        status: 'past',
        tickets: 1,
        totalAmount: 149.99,
        image: '/api/placeholder/300/200',
        description: 'Three-day music festival with top artists'
      },
      {
        id: 3,
        title: 'Business Workshop',
        date: '2024-10-05',
        time: '14:00',
        location: 'New York, NY',
        category: 'Business',
        status: 'past',
        tickets: 1,
        totalAmount: 199.99,
        image: '/api/placeholder/300/200',
        description: 'Learn business strategies from industry experts'
      }
    ];
    setEvents(mockEvents);
    setFilteredEvents(mockEvents);
  }, []);

  useEffect(() => {
    let filtered = events.filter(event => {
      const matchesTab = activeTab === 'all' || event.status === activeTab;
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filters.category === 'all' || event.category === filters.category;
      const matchesStatus = filters.status === 'all' || event.status === filters.status;
      
      return matchesTab && matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        default:
          return 0;
      }
    });

    setFilteredEvents(filtered);
  }, [events, activeTab, searchTerm, filters, sortBy]);

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: events.filter(e => e.status === 'upcoming').length },
    { id: 'past', label: 'Past Events', count: events.filter(e => e.status === 'past').length },
    { id: 'all', label: 'All Events', count: events.length }
  ];

  const categories = ['Technology', 'Music', 'Business', 'Education', 'Sports', 'Food'];

  const handleDownloadTicket = (eventId) => {
    // TODO: Implement ticket download
    console.log('Downloading ticket for event:', eventId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'past':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            My Events
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your event tickets and history
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } transition-colors`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 space-y-4`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? `${isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'} shadow-sm`
                : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              activeTab === tab.id
                ? isDarkMode ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600'
                : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No events found</p>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row">
                {/* Event Image */}
                <div className="lg:w-80 h-48 lg:h-auto bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-white opacity-80" />
                </div>
                
                {/* Event Details */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.title}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      
                      <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {event.description}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {formatDate(event.date)} at {event.time}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {event.location}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Ticket className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {event.tickets} ticket{event.tickets !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {event.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col space-y-3">
                      <div className={`text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <div className="text-2xl font-bold">${event.totalAmount}</div>
                        <div className="text-sm text-gray-500">Total Paid</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } transition-colors`}>
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        
                        {event.status === 'upcoming' && (
                          <button
                            onClick={() => handleDownloadTicket(event.id)}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventHistory;
