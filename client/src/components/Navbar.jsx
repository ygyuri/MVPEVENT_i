import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, User, LogOut, Bell, Settings, BarChart3, Calendar } from 'lucide-react';
import { ThemeToggle, useTheme } from '../contexts/ThemeContext';
import CurrencySelector from './CurrencySelector';
import { logout } from '../store/slices/authSlice';

const Navbar = ({ onOpenAuthModal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { isDarkMode } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="navbar-modern sticky top-0 z-50 theme-transition">
      <div className="container-modern">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-web3-primary font-bold text-xl">Event-i</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link 
              to="/events" 
              className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
            >
              Events
            </Link>
            {/* {isAuthenticated && (
              <Link 
                to="/wallet" 
                className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
              >
                Wallet
              </Link>
            )} */}
            {isAuthenticated && (user?.role === 'admin' || user?.role === 'organizer') && (
              <Link 
                to="/organizer" 
                className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
              >
                Organizer
              </Link>
            )}
            {/* <Link 
              to="/auth-test" 
              className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
            >
              Auth Test
            </Link>
            <Link 
              to="/polls-test" 
              className="text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
            >
              Polls Test
            </Link> */}
          </div>

          {/* Right side - Theme Toggle, Currency Selector, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle size="default" />
            
            {/* Currency Selector */}
            <CurrencySelector className="hidden md:block" />

            {/* Authentication Section */}
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200"
                >
                  <User className="w-6 h-6" />
                  <span className="hidden md:block text-sm font-medium">
                    {user?.name || user?.firstName || user?.username || 'User'}
                  </span>
                </button>
                
                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className={`absolute right-0 mt-3 w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl py-3 z-50 theme-transition shadow-2xl`}>
                    <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>{user?.email}</p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                          {user?.role}
                        </span>
                      </div>
                    </div>
                    {/* User Section */}
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-3 transition-colors duration-200`}
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>

                    {/* Reminders Section */}
                    <Link
                      to="/preferences/reminders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-3 transition-colors duration-200`}
                    >
                      <Bell className="w-4 h-4" />
                      <span>Reminder Preferences</span>
                    </Link>
                    <Link
                      to="/reminders/history"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-3 transition-colors duration-200`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Reminder History</span>
                    </Link>

                    {/* Organizer Section */}
                    {(user?.role === 'admin' || user?.role === 'organizer') && (
                      <>
                        <div className={`px-6 py-2 text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Organizer Tools
                        </div>
                        <Link
                          to="/scanner"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-3 transition-colors duration-200`}
                        >
                          <Settings className="w-4 h-4" />
                          <span>QR Scanner</span>
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
                      className={`w-full px-6 py-3 text-left text-sm ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'} flex items-center space-x-3 transition-colors duration-200 rounded-b-2xl`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={onOpenAuthModal}
                className="btn-web3-primary flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold"
              >
                <User className="w-5 h-5" />
                <span className="hidden md:block">Sign In</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 card-modern mt-2">
              <Link 
                to="/" 
                className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/events" 
                className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Events
              </Link>
              {/* Wallet feature - temporarily hidden */}
              {/* {isAuthenticated && (
                <Link 
                  to="/wallet" 
                  className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Wallet
                </Link>
              )} */}
              {isAuthenticated && (user?.role === 'admin' || user?.role === 'organizer') && (
                <Link 
                  to="/organizer" 
                  className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Organizer
                </Link>
              )}
              <Link 
                to="/auth-test" 
                className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Auth Test
              </Link>
              <Link 
                to="/polls-test" 
                className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Polls Test
              </Link>
              {isAuthenticated && (user?.role === 'admin' || user?.role === 'organizer') && (
                <Link 
                  to="/scanner" 
                  className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Scanner
                </Link>
              )}
              {/* Mobile Reminder Links */}
              {isAuthenticated && (
                <>
                  <Link 
                    to="/preferences/reminders" 
                    className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Reminder Preferences
                  </Link>
                  <Link 
                    to="/reminders/history" 
                    className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Reminder History
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* AuthModal */}
      
      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;