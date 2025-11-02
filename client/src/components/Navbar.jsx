import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  Bell,
  Settings,
  BarChart3,
  Globe,
  ChevronDown,
  Star,
  Shield,
} from "lucide-react";
import { ThemeToggle, useTheme } from "../contexts/ThemeContext";
import CurrencySelector from "./CurrencySelector";
import { logout } from "../store/slices/authSlice";

const Navbar = ({ onOpenAuthModal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();

  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { isDarkMode } = useTheme();

  // Check if a link is active
  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await dispatch(logout());
    setIsUserMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`sticky top-0 z-50 backdrop-blur-xl shadow-sm transition-colors duration-300 ${
        isDarkMode ? "bg-transparent" : "bg-web3-primary"
      }`}
    >
      {/* Top Bar - Trust Indicators - Hidden on Mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className={`py-1 hidden md:block ${
          isDarkMode
            ? "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] text-white"
            : "bg-gradient-to-r from-[#4f0f69]/90 to-[#6b1a8a]/90 text-white"
        }`}
      >
        <div className="container-modern">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex items-center space-x-1"
              >
                <Shield className="w-3 h-3" />
                <span>Secure & Trusted</span>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex items-center space-x-1"
              >
                <Star className="w-3 h-3" />
                <span>Premium Experience</span>
              </motion.div>
            </div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center space-x-4"
            >
              <span>24/7 Support</span>
              <span>•</span>
              <span>Multi-Currency</span>
              <span>•</span>
              <span>Instant Delivery</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Navigation */}
      <div className="container-modern">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Brand Logo */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Link
              to="/"
              className="flex items-center space-x-2 sm:space-x-3 group"
            >
              <div className="w-32 h-32 sm:w-28 sm:h-28 md:w-32 md:h-32 flex items-center justify-center">
                <img
                  src={
                    isDarkMode
                      ? "/logos/event-i_dark_mode_logo.png"
                      : "/logos/event-i_light_mode_logo.png"
                  }
                  alt="Event-i Logo"
                  className="h-28 sm:h-24 md:h-28 w-auto object-contain"
                  onError={(e) => {
                    console.error("Logo failed to load:", e.target.src);
                    // Fallback to text logo
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <div
                  className="h-28 sm:h-24 md:h-28 flex items-center justify-center text-2xl sm:text-xl md:text-2xl font-bold text-web3-accent"
                  style={{ display: "none" }}
                >
                  Event-i
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Modern Navigation */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="hidden md:flex items-center space-x-1 lg:space-x-2"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/"
                className={`relative px-6 lg:px-8 py-3 lg:py-4 transition-all duration-300 font-semibold text-sm lg:text-base ${
                  isActive("/")
                    ? isDarkMode
                      ? "text-white"
                      : "text-[#4f0f69]"
                    : isDarkMode
                    ? "text-gray-300 hover:text-white hover:bg-[#4f0f69]/20"
                    : "text-gray-600 hover:text-[#4f0f69] hover:bg-gray-50"
                }`}
              >
                Discover
                {isActive("/") && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/events"
                className={`relative px-6 lg:px-8 py-3 lg:py-4 transition-all duration-300 font-semibold text-sm lg:text-base ${
                  isActive("/events")
                    ? isDarkMode
                      ? "text-white"
                      : "text-[#4f0f69]"
                    : isDarkMode
                    ? "text-gray-300 hover:text-white hover:bg-[#4f0f69]/20"
                    : "text-gray-600 hover:text-[#4f0f69] hover:bg-gray-50"
                }`}
              >
                Events
                {isActive("/events") && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
            {isAuthenticated && user?.role === "admin" && (
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/admin"
                  className={`relative px-6 lg:px-8 py-3 lg:py-4 transition-all duration-300 font-semibold text-sm lg:text-base ${
                    isActive("/admin")
                      ? isDarkMode
                        ? "text-white"
                        : "text-[#4f0f69]"
                      : isDarkMode
                      ? "text-gray-300 hover:text-white hover:bg-[#4f0f69]/20"
                      : "text-gray-600 hover:text-[#4f0f69] hover:bg-gray-50"
                  }`}
                >
                  Admin
                  {isActive("/admin") && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            )}
            {isAuthenticated &&
              (user?.role === "admin" || user?.role === "organizer") && (
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/organizer"
                    className={`relative px-6 lg:px-8 py-3 lg:py-4 transition-all duration-300 font-semibold text-sm lg:text-base ${
                      isActive("/organizer")
                        ? isDarkMode
                          ? "text-white"
                          : "text-[#4f0f69]"
                        : isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-[#4f0f69]/20"
                        : "text-gray-600 hover:text-[#4f0f69] hover:bg-gray-50"
                    }`}
                  >
                    Organizer
                    {isActive("/organizer") && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                </motion.div>
              )}
          </motion.div>

          {/* Modern Right Side */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex items-center space-x-2 lg:space-x-3"
          >
            {/* Theme Toggle */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              <ThemeToggle size="default" />
            </motion.div>

            {/* Notifications - Hidden */}
            {/* {isAuthenticated && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-3 rounded-xl transition-colors duration-300 shadow-sm ${
                  isDarkMode
                    ? "text-gray-400 hover:text-white hover:bg-[#4f0f69]/20"
                    : "text-gray-600 hover:text-[#4f0f69] hover:bg-white/80"
                }`}
              >
                <Bell className="w-5 h-5" />
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <span className="text-xs text-white font-bold">3</span>
                </motion.div>
              </motion.button>
            )} */}

            {/* Modern Authentication Section - Hidden on Mobile */}
            {isAuthenticated ? (
              <div className="relative hidden md:block">
                <motion.button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 lg:p-3 rounded-lg transition-all duration-300 group ${
                    isUserMenuOpen
                      ? isDarkMode
                        ? "bg-[#4f0f69]/30 shadow-lg shadow-[#4f0f69]/20"
                        : "bg-white shadow-lg"
                      : isDarkMode
                      ? "bg-[#4f0f69]/20 hover:bg-[#4f0f69]/30"
                      : "bg-white/80 hover:bg-white"
                  }`}
                  aria-label={
                    isUserMenuOpen ? "Close user menu" : "Open user menu"
                  }
                  aria-expanded={isUserMenuOpen}
                >
                  <motion.div
                    animate={{ rotate: isUserMenuOpen ? 90 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Menu
                      className={`w-6 h-6 lg:w-7 lg:h-7 transition-colors duration-300 ${
                        isUserMenuOpen
                          ? "text-[#4f0f69] dark:text-white"
                          : "text-gray-600 dark:text-gray-300 group-hover:text-[#4f0f69] dark:group-hover:text-white"
                      }`}
                    />
                  </motion.div>
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`absolute right-0 mt-2 w-72 ${
                        isDarkMode
                          ? "bg-gray-800/95 backdrop-blur-md border-gray-700"
                          : "bg-white/95 backdrop-blur-md border-gray-200"
                      } border rounded-2xl shadow-2xl z-50 overflow-hidden`}
                    >
                      {/* User Info Header */}
                      <div
                        className={`px-4 py-4 border-b ${
                          isDarkMode
                            ? "border-gray-700 bg-gradient-to-r from-[#4f0f69]/20 to-transparent"
                            : "border-gray-200 bg-gradient-to-r from-blue-50/50 to-transparent"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#4f0f69] to-[#6b1a8a] rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white/50 dark:ring-gray-700/50 shadow-lg">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-base font-semibold truncate ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {user?.name ||
                                `${user?.firstName || ""} ${
                                  user?.lastName || ""
                                }`.trim() ||
                                "User"}
                            </p>
                            <p
                              className={`text-xs truncate ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              } mt-0.5`}
                            >
                              {user?.email || "No email"}
                            </p>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                                  isDarkMode
                                    ? "bg-blue-900/40 text-blue-300 border border-blue-800/50"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {user?.role || "user"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* My Profile */}
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`flex items-center px-4 py-3 text-sm font-medium mx-1 my-0.5 rounded-xl transition-all duration-200 group ${
                            isDarkMode
                              ? "text-gray-300 hover:bg-[#4f0f69]/30 hover:text-white"
                              : "text-gray-700 hover:bg-blue-50 hover:text-[#4f0f69]"
                          }`}
                        >
                          <User className="w-4 h-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span>My Profile</span>
                        </Link>

                        {/* Reminders Section */}
                        <div
                          className={`px-4 py-2 mt-1 ${
                            isDarkMode
                              ? "border-t border-gray-700"
                              : "border-t border-gray-200"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold mb-2 px-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            } uppercase tracking-wide`}
                          >
                            Reminders
                          </p>
                          <Link
                            to="/preferences/reminders"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center px-4 py-3 mx-1 my-0.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                              isDarkMode
                                ? "text-gray-300 hover:bg-[#4f0f69]/30 hover:text-white"
                                : "text-gray-700 hover:bg-blue-50 hover:text-[#4f0f69]"
                            }`}
                          >
                            <Settings className="w-4 h-4 mr-3 flex-shrink-0 group-hover:rotate-90 transition-transform" />
                            <span>Preferences</span>
                          </Link>
                          <Link
                            to="/reminders/history"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center px-4 py-3 mx-1 my-0.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                              isDarkMode
                                ? "text-gray-300 hover:bg-[#4f0f69]/30 hover:text-white"
                                : "text-gray-700 hover:bg-blue-50 hover:text-[#4f0f69]"
                            }`}
                          >
                            <Bell className="w-4 h-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <span>History</span>
                          </Link>
                        </div>

                        {/* Organizer Section */}
                        {(user?.role === "admin" ||
                          user?.role === "organizer") && (
                          <div
                            className={`px-4 py-2 ${
                              isDarkMode
                                ? "border-t border-gray-700"
                                : "border-t border-gray-200"
                            }`}
                          >
                            <p
                              className={`text-xs font-semibold mb-2 px-1 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              } uppercase tracking-wide`}
                            >
                              Organizer Tools
                            </p>
                            <Link
                              to="/scanner"
                              onClick={() => setIsUserMenuOpen(false)}
                              className={`flex items-center px-4 py-3 mx-1 my-0.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                                isDarkMode
                                  ? "text-gray-300 hover:bg-[#4f0f69]/30 hover:text-white"
                                  : "text-gray-700 hover:bg-blue-50 hover:text-[#4f0f69]"
                              }`}
                            >
                              <Shield className="w-4 h-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span>QR Scanner</span>
                            </Link>
                          </div>
                        )}

                        {/* Sign Out */}
                        <div
                          className={`px-4 pt-2 pb-2 ${
                            isDarkMode
                              ? "border-t border-gray-700"
                              : "border-t border-gray-200"
                          }`}
                        >
                          <button
                            onClick={handleLogout}
                            className={`flex items-center w-full px-4 py-3 mx-1 text-sm font-medium rounded-xl transition-all duration-200 group ${
                              isDarkMode
                                ? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
                                : "text-red-600 hover:bg-red-50 hover:text-red-700"
                            }`}
                          >
                            <LogOut className="w-4 h-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => onOpenAuthModal(true)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`hidden md:flex items-center space-x-2 px-5 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl transition-all duration-300 font-semibold text-sm lg:text-base shadow-md hover:shadow-lg ${
                  isDarkMode
                    ? "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] hover:from-[#6b1a8a] hover:to-[#8A4FFF] text-white border border-[#4f0f69]/50"
                    : "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] hover:from-[#6b1a8a] hover:to-[#8A4FFF] text-white border border-[#4f0f69]/20"
                }`}
              >
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Sign In</span>
              </motion.button>
            )}

            {/* Mobile menu button */}
            <motion.button
              onClick={toggleMenu}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`md:hidden p-2.5 rounded-xl transition-all duration-300 ${
                isMenuOpen
                  ? isDarkMode
                    ? "bg-[#4f0f69]/30 text-white"
                    : "bg-[#4f0f69]/10 text-[#4f0f69]"
                  : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-[#4f0f69]/20"
                  : "text-gray-600 hover:text-[#4f0f69] hover:bg-gray-100"
              }`}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.div>
            </motion.button>
          </motion.div>
        </div>

        {/* Modern Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              {/* Menu Content - Slide in from top */}
              <motion.div
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`fixed inset-x-0 top-0 md:hidden z-50 ${
                  isDarkMode ? "bg-gray-900" : "bg-white"
                } shadow-2xl max-h-screen overflow-y-auto`}
              >
                {/* Header with close button */}
                <div
                  className={`flex items-center justify-between px-4 py-4 border-b ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <h2
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Menu
                  </h2>
                  <motion.button
                    onClick={() => setIsMenuOpen(false)}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                {/* User Info Section (if authenticated) */}
                {isAuthenticated && (
                  <div
                    className={`px-4 py-4 border-b ${
                      isDarkMode
                        ? "border-gray-700 bg-gray-800/50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#4f0f69] to-[#6b1a8a] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-base font-semibold truncate ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {user?.name ||
                            `${user?.firstName || ""} ${
                              user?.lastName || ""
                            }`.trim() ||
                            user?.username ||
                            "User"}
                        </p>
                        <p
                          className={`text-sm truncate ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {user?.email || "No email"}
                        </p>
                        {user?.role && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              isDarkMode
                                ? "bg-blue-900/30 text-blue-300"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="px-4 py-4 space-y-1">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <Link
                      to="/"
                      className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-semibold text-base min-h-[48px] ${
                        isDarkMode
                          ? "text-gray-200 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                          : "text-gray-700 active:bg-gray-100 hover:bg-gray-50"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Discover
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <Link
                      to="/events"
                      className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-semibold text-base min-h-[48px] ${
                        isDarkMode
                          ? "text-gray-200 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                          : "text-gray-700 active:bg-gray-100 hover:bg-gray-50"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Events
                    </Link>
                  </motion.div>

                  {isAuthenticated && user?.role === "admin" && (
                    <>
                      <div
                        className={`h-px my-2 ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-200"
                        }`}
                      />
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        <Link
                          to="/admin"
                          className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-semibold text-base min-h-[48px] ${
                            isDarkMode
                              ? "text-gray-200 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                              : "text-gray-700 active:bg-gray-100 hover:bg-gray-50"
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Shield className="w-5 h-5 mr-3" />
                          Admin Dashboard
                        </Link>
                      </motion.div>
                    </>
                  )}
                  {isAuthenticated &&
                    (user?.role === "admin" || user?.role === "organizer") && (
                      <>
                        <div
                          className={`h-px my-2 ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-200"
                          }`}
                        />
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.3 }}
                        >
                          <Link
                            to="/organizer"
                            className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-semibold text-base min-h-[48px] ${
                              isDarkMode
                                ? "text-gray-200 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                                : "text-gray-700 active:bg-gray-100 hover:bg-gray-50"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Organizer Dashboard
                          </Link>
                        </motion.div>
                      </>
                    )}

                  {/* Additional Links for Authenticated Users */}
                  {isAuthenticated && (
                    <>
                      <div
                        className={`h-px my-2 ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-200"
                        }`}
                      />
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.25, duration: 0.3 }}
                      >
                        <Link
                          to="/profile"
                          className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-medium text-sm min-h-[48px] ${
                            isDarkMode
                              ? "text-gray-300 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                              : "text-gray-600 active:bg-gray-100 hover:bg-gray-50"
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <User className="w-5 h-5 mr-3" />
                          My Profile
                        </Link>
                      </motion.div>

                      {user?.role === "admin" || user?.role === "organizer" ? (
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3, duration: 0.3 }}
                        >
                          <Link
                            to="/scanner"
                            className={`flex items-center px-4 py-4 rounded-xl transition-all duration-200 font-medium text-sm min-h-[48px] ${
                              isDarkMode
                                ? "text-gray-300 active:bg-[#4f0f69]/40 hover:bg-[#4f0f69]/30"
                                : "text-gray-600 active:bg-gray-100 hover:bg-gray-50"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Shield className="w-5 h-5 mr-3" />
                            QR Scanner
                          </Link>
                        </motion.div>
                      ) : null}
                    </>
                  )}

                  {/* Sign Out / Sign In */}
                  <div
                    className={`h-px my-2 ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}
                  />
                  {isAuthenticated ? (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.35, duration: 0.3 }}
                    >
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className={`flex items-center w-full px-4 py-4 rounded-xl transition-all duration-200 font-medium text-sm min-h-[48px] ${
                          isDarkMode
                            ? "text-red-400 active:bg-red-900/20 hover:bg-red-900/10"
                            : "text-red-600 active:bg-red-50 hover:bg-red-50/50"
                        }`}
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                    >
                      <button
                        onClick={() => {
                          onOpenAuthModal?.(true);
                          setIsMenuOpen(false);
                        }}
                        className={`flex items-center justify-center w-full px-4 py-4 rounded-xl transition-all duration-200 font-semibold text-base min-h-[48px] ${
                          isDarkMode
                            ? "bg-[#4f0f69] text-white active:bg-[#6b1a8a] hover:bg-[#5a1580]"
                            : "bg-[#4f0f69] text-white active:bg-[#6b1a8a] hover:bg-[#5a1580]"
                        }`}
                      >
                        <User className="w-5 h-5 mr-2" />
                        Sign In / Sign Up
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Bottom padding for safe area */}
                <div className="h-4 sm:h-8" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* AuthModal */}

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </motion.nav>
  );
};

export default Navbar;
