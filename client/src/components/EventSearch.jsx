import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, MapPin, Calendar, DollarSign, X } from 'lucide-react'
import { cn } from '../utils/cn'
import { useDebounce } from '../utils/useDebounce'

const EventSearch = ({ onSearch, onFilter, categories = [] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [fromType, setFromType] = useState('text')
  const [toType, setToType] = useState('text')

  const debouncedSearch = useDebounce(searchTerm, 350)
  const didMountRef = useRef(false)

  // Debounced search, ignore first mount; trigger full list on clear
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    const q = (debouncedSearch || '').trim()
    if (q.length === 0) {
      onSearch('')
      return
    }
    if (q.length >= 2) {
      onSearch(q)
    }
  }, [debouncedSearch, onSearch])

  const handleFilter = useCallback(() => {
    onFilter({
      category: selectedCategory,
      location: selectedLocation,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      startDate: dateRange.from,
      endDate: dateRange.to
    })
  }, [onFilter, selectedCategory, selectedLocation, priceRange, dateRange])

  const clearFilters = useCallback(() => {
    setSelectedCategory('')
    setSelectedLocation('')
    setPriceRange({ min: '', max: '' })
    setDateRange({ from: '', to: '' })
    setFromType('text')
    setToType('text')
    onFilter({})
  }, [onFilter])

  const hasActiveFilters = selectedCategory || selectedLocation || priceRange.min || priceRange.max || dateRange.from || dateRange.to

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Main Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search events, venues, or categories... (min 2 chars)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-lg"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition-all duration-200",
              showFilters 
                ? "bg-primary-500 text-white shadow-lg" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name} {category.eventCount ? `(${category.eventCount})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="City, State, or Country"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                      className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div className="relative flex-1">
                    <DollarSign className="w-4 h-4" />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                      className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={fromType}
                      inputMode="numeric"
                      pattern="\d{4}-\d{2}-\d{2}"
                      placeholder="Start (YYYY-MM-DD)"
                      aria-label="Start date"
                      value={dateRange.from}
                      onFocus={() => setFromType('date')}
                      onBlur={(e) => { if (!e.target.value) setFromType('text') }}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={toType}
                      inputMode="numeric"
                      pattern="\d{4}-\d{2}-\d{2}"
                      placeholder="End (YYYY-MM-DD)"
                      aria-label="End date"
                      value={dateRange.to}
                      onFocus={() => setToType('date')}
                      onBlur={(e) => { if (!e.target.value) setToType('text') }}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Use start/end to narrow by date range</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleFilter}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2 px-4 rounded-xl font-medium hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Apply Filters
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    title="Clear filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="flex flex-wrap gap-2">
                  {selectedCategory && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
                      Category: {categories.find(c => c.slug === selectedCategory)?.name}
                      <button
                        onClick={() => setSelectedCategory('')}
                        className="ml-2 hover:text-primary-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedLocation && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      Location: {selectedLocation}
                      <button
                        onClick={() => setSelectedLocation('')}
                        className="ml-2 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(priceRange.min || priceRange.max) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                      Price: ${priceRange.min || '0'} - ${priceRange.max || '∞'}
                      <button
                        onClick={() => setPriceRange({ min: '', max: '' })}
                        className="ml-2 hover:text-green-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      Date: {dateRange.from || 'Any'} → {dateRange.to || 'Any'}
                      <button
                        onClick={() => setDateRange({ from: '', to: '' })}
                        className="ml-2 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EventSearch 