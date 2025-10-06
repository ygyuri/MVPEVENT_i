import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, register, clearError } from '../store/slices/authSlice'
import { useTheme } from '../contexts/ThemeContext'

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    walletAddress: '',
    role: 'customer'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth)
  const { isDarkMode } = useTheme()

  // Close modal after authentication without updating during render
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose()
    }
  }, [isAuthenticated, isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    try {
      if (isLogin) {
        const result = await dispatch(login({ email: formData.email, password: formData.password })).unwrap()
        console.log('✅ [AUTH MODAL] Login successful:', result.user);
        
        setSuccessMessage('Welcome back! You have successfully signed in.')
        
        // Close modal and navigate based on user role
        setTimeout(() => {
          onClose()
          
          // Navigate based on user role
          if (result.user.role === 'organizer') {
            console.log('🔄 [AUTH MODAL] Redirecting organizer to dashboard');
            navigate('/organizer/dashboard');
          } else {
            console.log('🔄 [AUTH MODAL] Redirecting customer to home');
            navigate('/');
          }
        }, 1500)
      } else {
        if (!formData.firstName || !formData.lastName || !formData.username) {
          setLocalError('Please fill in all required fields.');
          return
        }
        if (formData.password.length < 8) {
          setLocalError('Password must be at least 8 characters long.')
          return
        }
        if (formData.password !== formData.confirmPassword) {
          setLocalError('Passwords do not match.')
          return
        }
        const result = await dispatch(register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          walletAddress: formData.walletAddress || undefined,
          role: formData.role
        })).unwrap()
        
        console.log('✅ [AUTH MODAL] Registration successful:', result.user);
        
        setSuccessMessage(`🎉 Welcome to Event-i, ${formData.firstName}! Your account has been created successfully. You can now explore events and join the community!`)
        setIsNewUser(true)
        
        setTimeout(() => {
          onClose()
          
          // Navigate based on user role
          if (result.user.role === 'organizer') {
            console.log('🔄 [AUTH MODAL] Redirecting new organizer to dashboard');
            navigate('/organizer/dashboard');
          } else {
            console.log('🔄 [AUTH MODAL] Redirecting new customer to home');
            navigate('/');
          }
        }, 3000)
      }
    } catch (err) {
      // handled by slice
    }
  }

  const handleInputChange = (e) => {
    dispatch(clearError())
    setLocalError('')
    setSuccessMessage('')
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const resetForm = () => {
    setLocalError('')
    setSuccessMessage('')
    setIsNewUser(false)
    dispatch(clearError())
    setFormData({
      email: '', password: '', confirmPassword: '', username: '', firstName: '', lastName: '', walletAddress: '', role: 'customer'
    })
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  return (
    <div className="modal-overlay bg-black/60 backdrop-blur-sm">
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden theme-transition max-h-[90vh] overflow-y-auto mx-4 sm:mx-6`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          
          <div className="relative flex justify-between items-center">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {isLogin ? 'Welcome Back' : 'Join Event-i'}
              </h2>
              <p className="text-white/90 text-sm sm:text-lg">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>
            <button 
              onClick={() => { resetForm(); onClose() }} 
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-8">
          {/* Success Message */}
          {successMessage && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-green-900/20 border-green-800 text-green-200' : 'bg-green-50 border-green-200 text-green-800'} border rounded-xl`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(localError || error) && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-800'} border rounded-xl`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    {localError || error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* New User Welcome Message */}
          {isNewUser && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'} border rounded-xl`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    🎯 <strong>Next Steps:</strong> Explore featured events, browse categories, and discover events that match your interests!
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>First Name</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      required 
                      className={`w-full px-4 py-3 rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`} 
                      placeholder="John" 
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Last Name</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      required 
                      className={`w-full px-4 py-3 rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`} 
                      placeholder="Doe" 
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Username</label>
                  <input 
                    type="text" 
                    name="username" 
                    value={formData.username} 
                    onChange={handleInputChange} 
                    required 
                    className="input-web3 w-full px-4 py-3 rounded-xl text-web3-primary placeholder-web3-cyan focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all duration-200" 
                    placeholder="johndoe" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Role</label>
                    <select 
                      name="role" 
                      value={formData.role} 
                      onChange={handleInputChange} 
                      className="input-web3 w-full px-4 py-3 rounded-xl text-web3-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all duration-200"
                    >
                      <option value="customer">Customer</option>
                      <option value="organizer">Organizer</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Wallet Address (Optional)</label>
                    <input 
                      type="text" 
                      name="walletAddress" 
                      value={formData.walletAddress} 
                      onChange={handleInputChange} 
                      className={`w-full px-4 py-3 rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`} 
                      placeholder="0x..." 
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                required 
                className="input-web3 w-full px-4 py-3 rounded-xl text-web3-primary placeholder-web3-cyan focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all duration-200" 
                placeholder="john@example.com" 
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                  className="input-web3 w-full px-4 py-3 pr-12 rounded-xl text-web3-primary placeholder-web3-cyan focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all duration-200" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(s => !s)} 
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200`}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange} 
                    required 
                    className="input-web3 w-full px-4 py-3 pr-12 rounded-xl text-web3-primary placeholder-web3-cyan focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all duration-200" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(s => !s)} 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200`}
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 sm:py-4 px-6 rounded-xl font-semibold text-white text-base sm:text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isLogin ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    )}
                  </svg>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </div>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 sm:mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'}`}>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>
            <button
              onClick={toggleMode}
              className={`mt-3 sm:mt-4 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-semibold text-base sm:text-lg transition-colors duration-200 flex items-center justify-center mx-auto`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal;
