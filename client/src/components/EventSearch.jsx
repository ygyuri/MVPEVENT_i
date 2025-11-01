import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  DollarSign,
  X,
  SlidersHorizontal,
  Tag,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useDebounce } from "../utils/useDebounce";

const EventSearch = ({ onSearch, onFilter, categories = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [fromType, setFromType] = useState("text");
  const [toType, setToType] = useState("text");
  const [isFocused, setIsFocused] = useState(false);
  const [sortBy, setSortBy] = useState("");

  const debouncedSearch = useDebounce(searchTerm, 350);
  const didMountRef = useRef(false);

  // Debounced search, ignore first mount; trigger full list on clear
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const q = (debouncedSearch || "").trim();
    if (q.length === 0) {
      onSearch("");
      return;
    }
    if (q.length >= 2) {
      onSearch(q);
    }
  }, [debouncedSearch, onSearch]);

  const handleFilter = useCallback(() => {
    onFilter({
      category: selectedCategory,
      location: selectedLocation,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      startDate: dateRange.from,
      endDate: dateRange.to,
      sort: sortBy,
    });
  }, [
    onFilter,
    selectedCategory,
    selectedLocation,
    priceRange,
    dateRange,
    sortBy,
  ]);

  const clearFilters = useCallback(() => {
    setSelectedCategory("");
    setSelectedLocation("");
    setPriceRange({ min: "", max: "" });
    setDateRange({ from: "", to: "" });
    setFromType("text");
    setToType("text");
    setSortBy("");
    onFilter({});
  }, [onFilter]);

  const hasActiveFilters =
    selectedCategory ||
    selectedLocation ||
    priceRange.min ||
    priceRange.max ||
    dateRange.from ||
    dateRange.to ||
    sortBy;

  const activeFilterCount = [
    selectedCategory,
    selectedLocation,
    priceRange.min || priceRange.max,
    dateRange.from || dateRange.to,
    sortBy,
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-4">
      {/* Main Search Bar - Modern Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div
          className={cn(
            "relative group transition-all duration-300",
            isFocused && "scale-[1.02]"
          )}
        >
          {/* Search Icon */}
          <div className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 z-10">
            <Search
              className={cn(
                "w-5 h-5 md:w-6 md:h-6 transition-colors duration-200",
                isFocused
                  ? "text-[#4f0f69] dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500"
              )}
            />
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search events, venues, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "w-full pl-12 md:pl-16 pr-20 md:pr-24 py-4 md:py-5",
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md",
              "border-2 rounded-2xl md:rounded-3xl",
              "text-base md:text-lg",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              isFocused
                ? "border-[#4f0f69] dark:border-purple-500 ring-4 ring-[#4f0f69]/20 dark:ring-purple-500/20"
                : "border-gray-200 dark:border-gray-700",
              "focus:outline-none",
              "text-web3-primary dark:text-white"
            )}
          />

          {/* Filter Toggle Button */}
          <div
            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-10"
            style={{ pointerEvents: "auto" }}
          >
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center justify-center",
                "w-10 h-10 md:w-11 md:h-11",
                "p-0 rounded-xl md:rounded-2xl",
                "transition-colors duration-200",
                "relative",
                showFilters
                  ? "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
              aria-label="Toggle filters"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={showFilters ? "close" : "filter"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  {showFilters ? (
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <SlidersHorizontal className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </motion.div>
              </AnimatePresence>
              {hasActiveFilters && activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center pointer-events-none">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Search Hint */}
        {!isFocused && searchTerm.length < 2 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-xs md:text-sm text-center text-gray-500 dark:text-gray-400"
          >
            Type at least 2 characters to search
          </motion.p>
        )}
      </motion.div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "bg-white/95 dark:bg-gray-800/95 backdrop-blur-md",
                "border-2 border-gray-200 dark:border-gray-700",
                "rounded-2xl md:rounded-3xl p-6 md:p-8",
                "shadow-xl"
              )}
            >
              {/* Filters Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="p-2.5 bg-gradient-to-br from-[#4f0f69] to-[#6b1a8a] rounded-xl shadow-lg"
                  >
                    <Filter className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-web3-primary dark:text-white">
                      Advanced Filters
                    </h3>
                    <p className="text-sm text-web3-secondary dark:text-gray-400">
                      Narrow down your search with precise filters
                    </p>
                  </div>
                </div>
                {hasActiveFilters && (
                  <motion.button
                    onClick={clearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </motion.button>
                )}
              </div>

              {/* Filters Grid */}
              <div className="space-y-6">
                {/* First Row: Category & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Category Filter */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-web3-primary dark:text-white">
                      <Tag className="w-4 h-4 text-[#4f0f69] dark:text-purple-400" />
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={cn(
                          "w-full px-4 py-3",
                          "bg-gray-50 dark:bg-gray-700/50",
                          "border-2 border-gray-300 dark:border-gray-600",
                          "rounded-xl",
                          "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                          "focus:border-[#4f0f69] dark:focus:border-purple-500",
                          "transition-all duration-200",
                          "text-web3-primary dark:text-white",
                          "cursor-pointer appearance-none",
                          "pr-10 font-medium",
                          selectedCategory &&
                            "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                            {category.eventCount
                              ? ` (${category.eventCount})`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>

                  {/* Location Filter */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-web3-primary dark:text-white">
                      <MapPin className="w-4 h-4 text-[#4f0f69] dark:text-purple-400" />
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="City, State, or Country"
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className={cn(
                          "w-full pl-11 pr-4 py-3",
                          "bg-gray-50 dark:bg-gray-700/50",
                          "border-2 border-gray-300 dark:border-gray-600",
                          "rounded-xl",
                          "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                          "focus:border-[#4f0f69] dark:focus:border-purple-500",
                          "transition-all duration-200",
                          "text-web3-primary dark:text-white",
                          "placeholder-gray-400 dark:placeholder-gray-500",
                          "font-medium",
                          selectedLocation &&
                            "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Second Row: Price Range & Sort */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Price Range */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-web3-primary dark:text-white">
                      <DollarSign className="w-4 h-4 text-[#4f0f69] dark:text-purple-400" />
                      Price Range (KES)
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
                        <input
                          type="number"
                          placeholder="Min"
                          min="0"
                          value={priceRange.min}
                          onChange={(e) =>
                            setPriceRange((prev) => ({
                              ...prev,
                              min: e.target.value,
                            }))
                          }
                          className={cn(
                            "w-full pl-9 pr-3 py-3",
                            "bg-gray-50 dark:bg-gray-700/50",
                            "border-2 border-gray-300 dark:border-gray-600",
                            "rounded-xl",
                            "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                            "focus:border-[#4f0f69] dark:focus:border-purple-500",
                            "transition-all duration-200",
                            "text-web3-primary dark:text-white",
                            "placeholder-gray-400 dark:placeholder-gray-500",
                            "font-medium",
                            priceRange.min &&
                              "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          )}
                        />
                      </div>
                      <div className="flex items-center text-gray-400 dark:text-gray-500 font-medium">
                        to
                      </div>
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
                        <input
                          type="number"
                          placeholder="Max"
                          min="0"
                          value={priceRange.max}
                          onChange={(e) =>
                            setPriceRange((prev) => ({
                              ...prev,
                              max: e.target.value,
                            }))
                          }
                          className={cn(
                            "w-full pl-9 pr-3 py-3",
                            "bg-gray-50 dark:bg-gray-700/50",
                            "border-2 border-gray-300 dark:border-gray-600",
                            "rounded-xl",
                            "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                            "focus:border-[#4f0f69] dark:focus:border-purple-500",
                            "transition-all duration-200",
                            "text-web3-primary dark:text-white",
                            "placeholder-gray-400 dark:placeholder-gray-500",
                            "font-medium",
                            priceRange.max &&
                              "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Sort By */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-web3-primary dark:text-white">
                      <TrendingUp className="w-4 h-4 text-[#4f0f69] dark:text-purple-400" />
                      Sort By
                    </label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={cn(
                          "w-full px-4 py-3",
                          "bg-gray-50 dark:bg-gray-700/50",
                          "border-2 border-gray-300 dark:border-gray-600",
                          "rounded-xl",
                          "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                          "focus:border-[#4f0f69] dark:focus:border-purple-500",
                          "transition-all duration-200",
                          "text-web3-primary dark:text-white",
                          "cursor-pointer appearance-none",
                          "pr-10 font-medium",
                          sortBy &&
                            "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      >
                        <option value="">Default (Soonest)</option>
                        <option value="soonest">Soonest First</option>
                        <option value="latest">Latest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="popular">Most Popular</option>
                        <option value="newest">Newest Events</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Third Row: Date Range */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-2"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold text-web3-primary dark:text-white">
                    <Clock className="w-4 h-4 text-[#4f0f69] dark:text-purple-400" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
                      <input
                        type={fromType}
                        inputMode="numeric"
                        pattern="\d{4}-\d{2}-\d{2}"
                        placeholder="Start Date (YYYY-MM-DD)"
                        value={dateRange.from}
                        onFocus={() => setFromType("date")}
                        onBlur={(e) => {
                          if (!e.target.value) setFromType("text");
                        }}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            from: e.target.value,
                          }))
                        }
                        className={cn(
                          "w-full pl-11 pr-4 py-3",
                          "bg-gray-50 dark:bg-gray-700/50",
                          "border-2 border-gray-300 dark:border-gray-600",
                          "rounded-xl",
                          "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                          "focus:border-[#4f0f69] dark:focus:border-purple-500",
                          "transition-all duration-200",
                          "text-web3-primary dark:text-white",
                          "placeholder-gray-400 dark:placeholder-gray-500",
                          "text-sm font-medium",
                          dateRange.from &&
                            "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
                      <input
                        type={toType}
                        inputMode="numeric"
                        pattern="\d{4}-\d{2}-\d{2}"
                        placeholder="End Date (YYYY-MM-DD)"
                        value={dateRange.to}
                        onFocus={() => setToType("date")}
                        onBlur={(e) => {
                          if (!e.target.value) setToType("text");
                        }}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            to: e.target.value,
                          }))
                        }
                        className={cn(
                          "w-full pl-11 pr-4 py-3",
                          "bg-gray-50 dark:bg-gray-700/50",
                          "border-2 border-gray-300 dark:border-gray-600",
                          "rounded-xl",
                          "focus:ring-2 focus:ring-[#4f0f69] dark:focus:ring-purple-500",
                          "focus:border-[#4f0f69] dark:focus:border-purple-500",
                          "transition-all duration-200",
                          "text-web3-primary dark:text-white",
                          "placeholder-gray-400 dark:placeholder-gray-500",
                          "text-sm font-medium",
                          dateRange.to &&
                            "border-[#4f0f69] dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Select date range to filter events by start date
                  </p>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <motion.button
                  onClick={handleFilter}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full sm:w-auto px-8 py-3 md:py-4",
                    "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a]",
                    "hover:from-[#6b1a8a] hover:to-[#8A4FFF]",
                    "text-white font-semibold text-base md:text-lg",
                    "rounded-xl md:rounded-2xl",
                    "shadow-lg hover:shadow-xl",
                    "transition-all duration-200",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Filter className="w-5 h-5" />
                  Apply Filters
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </motion.button>
                {hasActiveFilters && (
                  <motion.button
                    onClick={clearFilters}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3",
                      "bg-gray-100 dark:bg-gray-700",
                      "hover:bg-gray-200 dark:hover:bg-gray-600",
                      "text-gray-700 dark:text-gray-300 font-medium",
                      "rounded-xl",
                      "transition-all duration-200",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </motion.button>
                )}
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm font-semibold text-web3-primary dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-[#4f0f69] to-[#6b1a8a] rounded-full" />
                    Active Filters ({activeFilterCount})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800"
                      >
                        <Tag className="w-3 h-3 mr-1.5" />
                        {categories.find((c) => c.slug === selectedCategory)
                          ?.name || selectedCategory}
                        <button
                          onClick={() => setSelectedCategory("")}
                          className="ml-2 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    )}
                    {selectedLocation && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800"
                      >
                        <MapPin className="w-3 h-3 mr-1.5" />
                        {selectedLocation}
                        <button
                          onClick={() => setSelectedLocation("")}
                          className="ml-2 hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    )}
                    {(priceRange.min || priceRange.max) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium border border-green-200 dark:border-green-800"
                      >
                        <DollarSign className="w-3 h-3 mr-1.5" />
                        {priceRange.min || "0"} - {priceRange.max || "∞"} KES
                        <button
                          onClick={() => setPriceRange({ min: "", max: "" })}
                          className="ml-2 hover:text-green-600 dark:hover:text-green-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    )}
                    {(dateRange.from || dateRange.to) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 font-medium border border-orange-200 dark:border-orange-800"
                      >
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {dateRange.from || "Any"} → {dateRange.to || "Any"}
                        <button
                          onClick={() => setDateRange({ from: "", to: "" })}
                          className="ml-2 hover:text-orange-600 dark:hover:text-orange-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    )}
                    {sortBy && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800"
                      >
                        <TrendingUp className="w-3 h-3 mr-1.5" />
                        Sort:{" "}
                        {
                          {
                            soonest: "Soonest",
                            latest: "Latest",
                            "price-low": "Price: Low to High",
                            "price-high": "Price: High to Low",
                            popular: "Popular",
                            newest: "Newest",
                          }[sortBy]
                        }
                        <button
                          onClick={() => setSortBy("")}
                          className="ml-2 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventSearch;
