import api from './api';

// Authentication fix utility (uses shared axios client with refresh handling)
export const checkAndFixAuth = async () => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  console.log('🔍 [AUTH FIX] Checking authentication...');
  console.log('🔍 [AUTH FIX] Token:', token ? 'Present' : 'Missing');
  console.log('🔍 [AUTH FIX] User:', user ? 'Present' : 'Missing');
  
  if (!token) {
    console.warn('🔍 [AUTH FIX] No authentication token found');
    return { isAuthenticated: false, needsLogin: true };
  }
  
  try {
    await api.get('/api/auth/me');
    console.log('✅ [AUTH FIX] Token is valid');
    return { isAuthenticated: true, needsLogin: false };
  } catch (error) {
    const status = error?.response?.status;
    console.warn(`❌ [AUTH FIX] Auth check error: ${status || error.message}`);
    if (status === 401 || status === 403) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      return { isAuthenticated: false, needsLogin: true };
    }
    // For 5xx or network errors, don't clear tokens; indicate temporary issue
    return { isAuthenticated: false, needsLogin: false };
  }
};

// Quick login function for testing
export const quickLogin = async (email = 'organizer@example.com', password = 'password123') => {
  try {
    console.log('🔍 [AUTH FIX] Attempting quick login...');
    const response = await api.post('/api/auth/login', { email, password });
    const data = response.data;
    localStorage.setItem('authToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    console.log('✅ [AUTH FIX] Quick login successful');
    return { success: true, user: data.user };
  } catch (error) {
    console.error('❌ [AUTH FIX] Quick login error:', error);
    const status = error?.response?.status;
    return { success: false, error: status || error.message };
  }
};
