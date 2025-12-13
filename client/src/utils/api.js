import axios from 'axios';

// Dynamic API URL for mobile and desktop access
const getApiBaseUrl = () => {
  // Use VITE_API_URL if available (for Docker environments)
  if (import.meta.env.VITE_API_URL) {
    const viteUrl = import.meta.env.VITE_API_URL;
    // If VITE_API_URL is localhost but we're accessing from a different hostname,
    // use the current hostname instead (for network access)
    if (viteUrl.includes('localhost') && typeof window !== 'undefined') {
      const currentHostname = window.location.hostname;
      if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
        // Extract port from VITE_API_URL or use default
        const urlMatch = viteUrl.match(/:(\d+)/);
        const port = urlMatch ? urlMatch[1] : '5001';
        return `http://${currentHostname}:${port}`;
      }
    }
    return viteUrl;
  }
  
  // Check if we're in development
  if (import.meta.env.DEV) {
    // Get the current hostname (works for both localhost and IP addresses)
    // Safe access for test environments
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    // Default to port 5001 to match server configuration
    const port = '5001';
    return `http://${hostname}:${port}`;
  }
  // Production: use same origin (relative URL)
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// Console log for debugging API configuration
console.log('🔧 API Configuration:', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  viteApiUrl: import.meta.env.VITE_API_URL,
  resolvedApiBaseUrl: API_BASE_URL,
  currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
});

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    // console.log('📤 API Request:', {
    //   method: config.method?.toUpperCase(),
    //   url: config.url,
    //   baseURL: config.baseURL,
    //   fullUrl: `${config.baseURL}${config.url}`,
    //   timestamp: new Date().toISOString()
    // });
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

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
  (response) => {
    // console.log('📥 API Response:', {
    //   status: response.status,
    //   statusText: response.statusText,
    //   url: response.config.url,
    //   timestamp: new Date().toISOString()
    // });
    return response;
  },
  async (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      timestamp: new Date().toISOString()
    });
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
