import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Heart, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Search,
  Filter,
  Grid,
  List,
  Star,
  Share2,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SavedEvents = () => {
  const { isDarkMode } = useTheme();
  const [savedEvents, setSavedEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    priceRange: 'all'
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockSavedEvents = [
      {
        id: 1,
        title: 'Web3 Summit 2024',
        date: '2024-12-20',
        time: '09:00',
        location: 'San Francisco, CA',
        category: 'Technology',
        price: 299,
        image: '/api/placeholder/300/200',
        description: 'Explore the future of decentralized technology',
        savedAt: '2024-09-10',
        isFavorite: true,
        rating: 4.8,
        attendees: 1250
      },
      {
        id: 2,
        title: 'Jazz Night',
        date: '2024-11-25',
        time: '19:30',
        location: 'New York, NY',
        category: 'Music',
        price: 89,
        image: '/api/placeholder/300/200',
        description: 'An evening of smooth jazz with renowned artists',
        savedAt: '2024-09-08',
        isFavorite: true,
        rating: 4.6,
        attendees: 300
      },
      {
        id: 3,
        title: 'Startup Pitch Competition',
        date: '2024-10-15',
        time: '14:00',
        location: 'Austin, TX',
        category: 'Business',
        price: 149,
        image: '/api/placeholder/300/200',
        description: 'Watch innovative startups pitch their ideas',
        savedAt: '2024-09-05',
        isFavorite: false,
        rating: 4.4,
        attendees: 500
      },
      {
        id: 4,
        title: 'Art Exhibition Opening',
        date: '2024-12-05',
        time: '18:00',
        location: 'Los Angeles, CA',
        category: 'Arts',
        price: 45,
        image: '/api/placeholder/300/200',
        description: 'Contemporary art exhibition featuring local artists',
        savedAt: '2024-09-12',
        isFavorite: true,
        rating: 4.7,
        attendees: 200
      }
    ];
    setSavedEvents(mockSavedEvents);
    setFilteredEvents(mockSavedEvents);
  }, []);

  useEffect(() => {
    let filtered = savedEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filters.category === 'all' || event.category === filters.category;
      
      return matchesSearch && matchesCategory;
    });

    setFilteredEvents(filtered);
  }, [savedEvents, searchTerm, filters]);

  const categories = ['Technology', 'Music', 'Business', 'Arts', 'Education', 'Sports', 'Food'];

  const handleRemoveFromSaved = (eventId) => {
    setSavedEvents(prev => prev.filter(event => event.id !== eventId));
    // TODO: Implement API call to remove from saved events
    console.log('Removing event from saved:', eventId);
  };

  const handleToggleFavorite = (eventId) => {
    setSavedEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isFavorite: !event.isFavorite }
        : event
    ));
    // TODO: Implement API call to toggle favorite
    console.log('Toggling favorite for event:', eventId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSavedDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const EventCard = ({ event }) => (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    } group hover:shadow-xl transition-all duration-300`}>
      {/* Event Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-cyan-500">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={() => handleToggleFavorite(event.id)}
            className={`p-2 rounded-full transition-colors ${
              event.isFavorite 
                ? 'bg-red-500 text-white' 
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${event.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button className={`p-2 rounded-full ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-white text-gray-600 hover:bg-gray-100'
          } transition-colors`}>
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-4 left-4">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            {event.category}
          </span>
        </div>
      </div>
      
      {/* Event Details */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2`}>
            {event.title}
          </h3>
          <div className="flex items-center space-x-1 ml-2">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {event.rating}
            </span>
          </div>
        </div>
        
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
          {event.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {formatDate(event.date)} at {event.time}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {event.location}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {event.attendees.toLocaleString()} attendees
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ${event.price}
          </div>
          
          <div className="flex space-x-2">
            <button className={`p-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } transition-colors`}>
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRemoveFromSaved(event.id)}
              className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              } transition-colors`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>
              Saved on {formatSavedDate(event.savedAt)}
            </span>
            <button className={`px-3 py-1 rounded-full font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-900/70' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}>
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const EventListItem = ({ event }) => (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    } p-6 hover:shadow-xl transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Event Image */}
        <div className="sm:w-48 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Calendar className="w-12 h-12 text-white opacity-80" />
        </div>
        
        {/* Event Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {event.title}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                {event.description}
              </p>
            </div>
            <div className="flex items-center space-x-1 ml-4">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {event.rating}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
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
              <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {event.attendees.toLocaleString()} attendees
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${event.price}
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {event.category}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleFavorite(event.id)}
                className={`p-2 rounded-lg transition-colors ${
                  event.isFavorite 
                    ? 'bg-red-500 text-white' 
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${event.isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } transition-colors`}>
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRemoveFromSaved(event.id)}
                className={`p-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                } transition-colors`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Saved Events
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your favorite events and bookmarks
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className={`flex rounded-xl p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? isDarkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
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
            placeholder="Search saved events..."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Price Range
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="under50">Under $50</option>
                  <option value="50-100">$50 - $100</option>
                  <option value="100-200">$100 - $200</option>
                  <option value="over200">Over $200</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events Display */}
      {filteredEvents.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No saved events found</p>
          <p>Start saving events you're interested in to see them here</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredEvents.map((event) => (
            viewMode === 'grid' ? (
              <EventCard key={event.id} event={event} />
            ) : (
              <EventListItem key={event.id} event={event} />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedEvents;
