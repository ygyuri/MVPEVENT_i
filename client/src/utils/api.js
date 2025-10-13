import axios from 'axios';

// Dynamic API URL for mobile and desktop access
const getApiBaseUrl = () => {
  // Use VITE_API_URL if available (for Docker environments)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in development
  if (import.meta.env.DEV) {
    // Get the current hostname (works for both localhost and IP addresses)
    // Safe access for test environments
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const port = '5000';
    return `http://${hostname}:${port}`;
  }
  // Production URL (replace with your actual production API URL)
  return 'https://your-production-api.com';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // Don't attempt refresh for auth endpoints or if no response
    const urlPath = (originalRequest.url || '').toString();
    const isAuthEndpoint = urlPath.includes('/api/auth/') && !urlPath.includes('/api/auth/me');

    if (!error.response || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // If unauthorized, try one refresh attempt
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.tokens;

        localStorage.setItem('authToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update header and retry original request
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // On refresh failure, clear tokens and surface the error without reloading
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common?.Authorization;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
