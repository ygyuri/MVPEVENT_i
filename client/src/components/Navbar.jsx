import React, { useState } from "react";
import { Link } from "react-router-dom";
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

  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { isDarkMode } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
        <div className="flex justify-between items-center h-20">
          {/* Brand Logo */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src={
                    isDarkMode
                      ? "/logos/evet-i_dark_mode_logo.png"
                      : "/logos/event-i_light_mode_logo.png"
                  }
                  alt="Event-i Logo"
                  className="h-28 w-auto object-contain"
                />
              </div>
            </Link>
          </motion.div>

          {/* Modern Navigation */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="hidden md:flex items-center space-x-2"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/"
                className={`px-8 py-4 rounded-2xl transition-all duration-300 font-semibold text-base ${
                  isDarkMode
                    ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                    : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                }`}
              >
                Discover
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/events"
                className={`px-8 py-4 rounded-2xl transition-all duration-300 font-semibold text-base ${
                  isDarkMode
                    ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                    : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                }`}
              >
                Events
              </Link>
            </motion.div>
            {/* {isAuthenticated && (
              <Link 
                to="/wallet" 
                className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
              >
                Wallet
              </Link>
            )} */}
            {isAuthenticated &&
              (user?.role === "admin" || user?.role === "organizer") && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/organizer"
                    className={`px-8 py-4 rounded-2xl transition-all duration-300 font-semibold text-base ${
                      isDarkMode
                        ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                        : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                    }`}
                  >
                    Organizer
                  </Link>
                </motion.div>
              )}
          </motion.div>

          {/* Modern Right Side */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            {/* Currency & Language */}
            {/* <div className="hidden lg:flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CurrencySelector
                  className={`rounded-xl px-4 py-2 shadow-sm transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-[#4f0f69]/20 hover:bg-[#4f0f69]/30"
                      : "bg-white/80 hover:bg-white"
                  }`}
                />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-1 px-4 py-2 rounded-xl cursor-pointer transition-colors duration-300 shadow-sm ${
                  isDarkMode
                    ? "bg-[#4f0f69]/20 hover:bg-[#4f0f69]/30"
                    : "bg-white/80 hover:bg-white"
                }`}
              >
                <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  EN
                </span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </motion.div>
            </div> */}

            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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

            {/* Modern Authentication Section */}
            {isAuthenticated ? (
              <div className="relative">
                <motion.button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-3 p-3 rounded-2xl transition-colors duration-300 group shadow-sm ${
                    isDarkMode
                      ? "bg-[#4f0f69]/20 hover:bg-[#4f0f69]/30"
                      : "bg-white/80 hover:bg-white"
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#4f0f69] to-[#6b1a8a] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.name ||
                        user?.firstName ||
                        user?.username ||
                        "User"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role === "admin"
                        ? "Administrator"
                        : user?.role === "organizer"
                        ? "Event Organizer"
                        : "Customer"}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-[#4f0f69] transition-colors duration-300" />
                  </motion.div>
                </motion.button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className={`absolute right-0 mt-3 w-64 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    } border rounded-2xl py-3 z-50 theme-transition shadow-2xl backdrop-blur-md bg-opacity-95 animate-in slide-in-from-top-2 duration-300`}
                  >
                    <div
                      className={`px-6 py-4 border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-100"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {user?.name ||
                          `${user?.firstName || ""} ${
                            user?.lastName || ""
                          }`.trim()}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        } mt-1`}
                      >
                        {user?.email}
                      </p>
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            isDarkMode
                              ? "bg-blue-900 text-blue-200"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user?.role}
                        </span>
                      </div>
                    </div>
                    {/* User Section */}
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode
                          ? "text-gray-200 hover:bg-gray-700 hover:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } transition-all duration-200 rounded-lg`}
                    >
                      My Profile
                    </Link>

                    {/* Reminders Section */}
                    <Link
                      to="/preferences/reminders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode
                          ? "text-gray-200 hover:bg-gray-700 hover:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } transition-all duration-200 rounded-lg`}
                    >
                      Reminder Preferences
                    </Link>
                    <Link
                      to="/reminders/history"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode
                          ? "text-gray-200 hover:bg-gray-700 hover:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } transition-all duration-200 rounded-lg`}
                    >
                      Reminder History
                    </Link>

                    {/* Organizer Section */}
                    {(user?.role === "admin" || user?.role === "organizer") && (
                      <>
                        <div
                          className={`px-6 py-2 text-xs font-semibold ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          } uppercase tracking-wider`}
                        >
                          Organizer Tools
                        </div>
                        <Link
                          to="/scanner"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`w-full px-6 py-4 text-left text-sm font-medium ${
                            isDarkMode
                              ? "text-gray-200 hover:bg-gray-700 hover:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          } transition-all duration-200 rounded-lg`}
                        >
                          QR Scanner
                        </Link>
                        {/* Analytics feature - temporarily hidden for production */}
                        {/* <Link
                          to="/organizer/analytics"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-3 transition-colors duration-200`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Analytics</span>
                        </Link> */}
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`w-full px-6 py-4 text-left text-sm font-medium ${
                        isDarkMode
                          ? "text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          : "text-red-600 hover:bg-red-50 hover:text-red-700"
                      } transition-all duration-200 rounded-lg`}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <motion.button
                onClick={() => onOpenAuthModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-colors duration-300 font-medium shadow-sm ${
                  isDarkMode
                    ? "bg-[#4f0f69] hover:bg-white text-white hover:text-[#4f0f69]"
                    : "bg-white hover:bg-[#4f0f69] text-[#4f0f69] hover:text-white border border-[#4f0f69]"
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden md:block">Sign In</span>
              </motion.button>
            )}

            {/* Mobile menu button */}
            <motion.button
              onClick={toggleMenu}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`md:hidden p-3 rounded-xl transition-colors duration-300 shadow-sm ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-[#4f0f69]/20"
                  : "text-gray-600 hover:text-[#4f0f69] hover:bg-white/80"
              }`}
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden overflow-hidden"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className={`px-4 pt-4 pb-6 space-y-2 rounded-2xl mt-4 shadow-lg ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <Link
                    to="/"
                    className={`px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-base ${
                      isDarkMode
                        ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                        : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Discover
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <Link
                    to="/events"
                    className={`px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-base ${
                      isDarkMode
                        ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                        : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Events
                  </Link>
                </motion.div>
                {isAuthenticated &&
                  (user?.role === "admin" || user?.role === "organizer") && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <Link
                        to="/organizer"
                        className={`px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-base ${
                          isDarkMode
                            ? "text-gray-200 hover:text-white hover:bg-[#4f0f69]/30 hover:shadow-lg hover:shadow-[#4f0f69]/20"
                            : "text-gray-600 hover:text-[#4f0f69] hover:bg-white hover:shadow-lg hover:shadow-gray-200/50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Organizer
                      </Link>
                    </motion.div>
                  )}
                {/* <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="pt-4 border-t border-gray-100 dark:border-gray-800"
                >
                  <div className="px-4 py-2">
                    <CurrencySelector className="w-full" />
                  </div>
                </motion.div> */}
              </motion.div>
            </motion.div>
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
