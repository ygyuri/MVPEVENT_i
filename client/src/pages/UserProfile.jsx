import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../contexts/ThemeContext';
import EventHistory from '../components/EventHistory';
import SavedEvents from '../components/SavedEvents';
import PaymentHistory from '../components/PaymentHistory';
import ProfileImageUpload from '../components/ProfileImageUpload';
import PhoneNumberInput from '../components/PhoneNumberInput';
import { updateUserProfile } from '../store/slices/authSlice';
import { 
  User, 
  Calendar, 
  Heart, 
  CreditCard, 
  Settings, 
  Edit3, 
  Camera,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const UserProfile = () => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    walletAddress: '',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        phone: user.profile?.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        walletAddress: user.walletAddress || '',
        notifications: {
          email: user.notifications?.email ?? true,
          push: user.notifications?.push ?? true,
          sms: user.notifications?.sms ?? false
        },
        privacy: {
          profileVisibility: user.privacy?.profileVisibility || 'public',
          showEmail: user.privacy?.showEmail ?? false,
          showPhone: user.privacy?.showPhone ?? false
        }
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but if provided, must be valid)
    if (formData.phone && formData.phone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Website validation (optional but if provided, must be valid URL)
    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid website URL';
      }
    }

    // Bio validation (optional but if provided, limit length)
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleImageChange = (file) => {
    setProfileImage(file);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setSaveMessage('Please fix the errors below before saving');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      // Convert profile image to base64 if present
      let avatarUrl = null;
      if (profileImage) {
        avatarUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(profileImage);
        });
      }

      // Prepare update data with proper field mapping
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        bio: formData.bio,
        website: formData.website,
        location: formData.location,
        walletAddress: formData.walletAddress,
        notifications: formData.notifications,
        privacy: formData.privacy
      };

      // Only include avatarUrl if we have a new image
      if (avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }

      console.log('Saving profile:', updateData);
      
      // Dispatch the update action
      const result = await dispatch(updateUserProfile(updateData));
      
      if (updateUserProfile.fulfilled.match(result)) {
        setSaveMessage('Profile updated successfully!');
        setIsEditing(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        // Handle validation errors from server
        const errorData = result.payload;
        if (errorData && errorData.details) {
          const serverErrors = {};
          errorData.details.forEach(error => {
            serverErrors[error.path] = error.msg;
          });
          setErrors(serverErrors);
          setSaveMessage('Please fix the validation errors below');
        } else {
          setSaveMessage(errorData || 'Failed to update profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'events', label: 'My Events', icon: Calendar },
    { id: 'saved', label: 'Saved Events', icon: Heart },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8 text-center`}>
          <Shield className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Access Required
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl mb-6 overflow-hidden border border-gray-200 dark:border-gray-700`}>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Profile Picture */}
              <div className="relative">
                <ProfileImageUpload
                  currentImage={user?.avatarUrl}
                  onImageChange={handleImageChange}
                  disabled={!isEditing}
                />
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold mb-1">
                  {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                </h1>
                <p className="text-white/90 text-sm sm:text-base mb-2">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="bg-white/20 px-2 py-1 rounded-full capitalize">
                    {user?.role}
                  </span>
                  <span className="bg-white/20 px-2 py-1 rounded-full">
                    Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Recently'}
                  </span>
                </div>
              </div>
              
              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white hover:bg-gray-50 text-gray-900 border border-white/20'} px-4 py-2 rounded-2xl font-semibold transition-all duration-200 flex items-center space-x-2 text-sm backdrop-blur-sm`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700`}>
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? `${isDarkMode ? 'bg-blue-900/50 text-blue-400 border border-blue-700/50' : 'bg-blue-50 text-blue-600 border border-blue-200'}`
                          : `${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'}`
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700`}>
              {activeTab === 'profile' && (
                <div>
                  <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Personal Information
                  </h2>
                  
                  {/* Success/Error Messages */}
                  {saveMessage && (
                    <div className={`mb-6 p-4 rounded-2xl border ${
                      saveMessage.includes('successfully') 
                        ? isDarkMode 
                          ? 'bg-green-900/20 border-green-700 text-green-200' 
                          : 'bg-green-50 border-green-200 text-green-800'
                        : isDarkMode 
                          ? 'bg-red-900/20 border-red-700 text-red-200' 
                          : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {saveMessage.includes('successfully') ? (
                            <CheckCircle className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                          ) : (
                            <AlertCircle className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{saveMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Form Errors */}
                  {Object.keys(errors).length > 0 && (
                    <div className={`mb-6 p-4 rounded-2xl border ${
                      isDarkMode 
                        ? 'bg-red-900/20 border-red-700 text-red-200' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <AlertCircle className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium mb-2">Please fix the following errors:</h3>
                          <ul className="text-sm space-y-1">
                            {Object.entries(errors).map(([field, error]) => (
                              <li key={field} className="flex items-center">
                                <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 rounded-2xl border ${
                          errors.name 
                            ? isDarkMode 
                              ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                              : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                            : isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                          !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.name && (
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          {errors.name}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                            errors.email 
                              ? isDarkMode 
                                ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                                : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                              : isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          {errors.email}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Phone Number
                      </label>
                      <PhoneNumberInput
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        error={errors.phone}
                        disabled={!isEditing}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Bio
                        <span className={`text-xs font-normal ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          (Optional, max 500 characters)
                        </span>
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-2xl border ${
                          errors.bio 
                            ? isDarkMode 
                              ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                              : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                            : isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                          !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        placeholder="Tell us about yourself..."
                      />
                      <div className="flex justify-between items-center mt-1">
                        {errors.bio && (
                          <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {errors.bio}
                          </p>
                        )}
                        <p className={`text-xs ml-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formData.bio.length}/500 characters
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          placeholder="Enter your location"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Website
                        <span className={`text-xs font-normal ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          (Optional)
                        </span>
                      </label>
                      <div className="relative">
                        <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                            errors.website 
                              ? isDarkMode 
                                ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                                : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                              : isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            !isEditing ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          placeholder="https://your-website.com"
                        />
                      </div>
                      {errors.website && (
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          {errors.website}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex justify-end space-x-4 mt-8">
                      <button
                        onClick={() => setIsEditing(false)}
                        className={`px-6 py-3 rounded-2xl font-semibold transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                          isSaving 
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && <EventHistory />}

              {activeTab === 'saved' && <SavedEvents />}

              {activeTab === 'payments' && <PaymentHistory />}

              {activeTab === 'settings' && (
                <div>
                  <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Account Settings
                  </h2>
                  
                  {/* Notifications */}
                  <div className="mb-8">
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Email Notifications
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Receive updates about events and account activity
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="notifications.email"
                            checked={formData.notifications.email}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            formData.notifications.email 
                              ? 'bg-blue-500' 
                              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                          } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Push Notifications
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Get notified about important updates
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="notifications.push"
                            checked={formData.notifications.push}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            formData.notifications.push 
                              ? 'bg-blue-500' 
                              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                          } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="mb-8">
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Privacy Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Profile Visibility
                        </label>
                        <select
                          name="privacy.profileVisibility"
                          value={formData.privacy.profileVisibility}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 rounded-2xl border ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                          <option value="friends">Friends Only</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Show Email Address
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Allow others to see your email address
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="privacy.showEmail"
                            checked={formData.privacy.showEmail}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            formData.privacy.showEmail 
                              ? 'bg-blue-500' 
                              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                          } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Security
                    </h3>
                    <div className="space-y-4">
                      <button className={`w-full flex items-center justify-between p-4 rounded-2xl border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                          : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                      } transition-colors`}>
                        <div className="flex items-center space-x-3">
                          <Lock className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          <span className="font-medium">Change Password</span>
                        </div>
                        <span className="text-sm text-blue-500">Update</span>
                      </button>
                      
                      <button className={`w-full flex items-center justify-between p-4 rounded-2xl border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                          : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                      } transition-colors`}>
                        <div className="flex items-center space-x-3">
                          <Shield className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          <span className="font-medium">Two-Factor Authentication</span>
                        </div>
                        <span className="text-sm text-blue-500">Enable</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
