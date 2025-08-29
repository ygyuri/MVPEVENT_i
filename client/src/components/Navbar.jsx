import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout, getCurrentUser } from '../store/slices/authSlice'
import AuthModal from './AuthModal'

const Navbar = () => {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showLogoutMessage, setShowLogoutMessage] = useState(false)
  const dispatch = useDispatch()
  const { isAuthenticated, user, authToken } = useSelector(state => state.auth)

  useEffect(() => {
    // Only fetch user data if we have a token and are not already authenticated
    if (authToken && !isAuthenticated && !user) {
      // Check if token is valid before making the request
      try {
        dispatch(getCurrentUser())
      } catch (error) {
        console.error('Failed to get current user:', error)
        // If it fails, clear the invalid token
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
      }
    }
  }, [dispatch, authToken, isAuthenticated, user])

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap()
      setShowLogoutMessage(true)
      setTimeout(() => {
        setShowLogoutMessage(false)
      }, 3000)
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails on server, clear local state
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
    }
  }

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary-600">Event-i</h1>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="/" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Home
                </a>
                <a href="/events" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Events
                </a>
                {isAuthenticated && user?.role === 'admin' && (
                  <a href="/admin" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Admin
                  </a>
                )}
                {isAuthenticated && (user?.role === 'organizer' || user?.role === 'admin') && (
                  <a href="/organizer" className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Organizer
                  </a>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Welcome, {user?.firstName || user?.username}!</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Success Message */}
      {showLogoutMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                👋 Successfully logged out! Come back soon to discover more amazing events.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}

export default Navbar 