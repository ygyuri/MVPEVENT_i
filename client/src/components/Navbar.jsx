import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCartItemCount } from '../store/slices/checkoutSlice';
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartItemCount = useSelector(selectCartItemCount);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-web3-card backdrop-blur-xl border-b border-web3-card-hover sticky top-0 z-50 theme-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          </div>

          {/* Right side - Cart, Theme Toggle, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle size="default" />
            
            {/* Cart */}
            <Link 
              to="/checkout" 
              className="relative p-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button className="p-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200">
                <User className="w-6 h-6" />
              </button>
            </div>

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
            <div className="px-2 pt-2 pb-3 space-y-1 bg-web3-card-hover rounded-lg mt-2 border border-web3-card-hover">
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
              <Link 
                to="/checkout" 
                className="block px-3 py-2 text-web3-secondary hover:text-web3-blue transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Cart ({cartItemCount})
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 