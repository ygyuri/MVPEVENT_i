import { create } from 'zustand'
import axios from 'axios'

// Dynamic API URL for mobile and desktop access
const getApiBaseUrl = () => {
  // Use VITE_API_URL if available (for Docker environments)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in development
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  
  // Production: use same origin (relative URL)
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// Console log for app store API configuration
console.log('📱 App Store API Configuration:', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  viteApiUrl: import.meta.env.VITE_API_URL,
  resolvedApiBaseUrl: API_BASE_URL
});

const useAppStore = create((set, get) => ({
  // State
  health: {
    status: 'unknown',
    message: '',
    timestamp: null
  },
  events: [],
  loading: false,
  error: null,
  
  // Authentication state
  user: null,
  authToken: localStorage.getItem('authToken') || null,
  isAuthenticated: !!localStorage.getItem('authToken'),

  // Actions
  checkHealth: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/api/health`)
      set({
        health: {
          status: response.data.status,
          message: response.data.message || 'API is healthy',
          timestamp: new Date().toISOString()
        },
        loading: false
      })
    } catch (error) {
      set({
        health: {
          status: 'error',
          message: error.message || 'API connection failed',
          timestamp: new Date().toISOString()
        },
        loading: false,
        error: error.message
      })
    }
  },

  // Fetch events with optional pagination mode: 'replace' | 'append'
  fetchEvents: async (params = {}, mode = 'replace') => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams(params).toString()
      const response = await axios.get(`${API_BASE_URL}/api/events?${queryParams}`)
      const events = response.data.events
      set(state => ({
        events: mode === 'append' ? [...state.events, ...events] : events,
        loading: false
      }))
      return response.data
    } catch (error) {
      set({ loading: false, error: error.message })
    }
  },

  fetchFeaturedEvents: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/events/featured`)
      return response.data.events
    } catch (error) {
      console.error('Error fetching featured events:', error)
      return []
    }
  },

  fetchTrendingEvents: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/events/trending`)
      return response.data.events
    } catch (error) {
      console.error('Error fetching trending events:', error)
      return []
    }
  },

  fetchCategories: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/events/categories`)
      return response.data.categories
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  },

  createEvent: async (eventData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/api/events`, eventData)
      const newEvent = response.data
      set(state => ({
        events: [...state.events, newEvent],
        loading: false
      }))
      return newEvent
    } catch (error) {
      set({ loading: false, error: error.message })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  // Authentication actions
  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      })
      
      const { user, tokens } = response.data
      localStorage.setItem('authToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      
      set({
        user,
        authToken: tokens.accessToken,
        isAuthenticated: true,
        loading: false
      })
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Login failed' 
      })
      throw error
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData)
      
      const { user, tokens } = response.data
      localStorage.setItem('authToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      
      set({
        user,
        authToken: tokens.accessToken,
        isAuthenticated: true,
        loading: false
      })
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Registration failed' 
      })
      throw error
    }
  },

  logout: async () => {
    try {
      const token = get().authToken
      if (token) {
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      set({
        user: null,
        authToken: null,
        isAuthenticated: false
      })
    }
  },

  getCurrentUser: async () => {
    const token = get().authToken
    if (!token) return

    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      set({ user: response.data.user })
    } catch (error) {
      console.error('Get current user error:', error)
      // Token might be expired, logout
      get().logout()
    }
  }
}))

export default useAppStore 