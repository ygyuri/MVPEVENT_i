// Authentication fix utility
export const checkAndFixAuth = () => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  console.log('🔍 [AUTH FIX] Checking authentication...');
  console.log('🔍 [AUTH FIX] Token:', token ? 'Present' : 'Missing');
  console.log('🔍 [AUTH FIX] User:', user ? 'Present' : 'Missing');
  
  if (!token) {
    console.warn('🔍 [AUTH FIX] No authentication token found');
    return { isAuthenticated: false, needsLogin: true };
  }
  
  // Test the token
  return fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ [AUTH FIX] Token is valid');
      return { isAuthenticated: true, needsLogin: false };
    } else {
      console.warn(`❌ [AUTH FIX] Token is invalid: ${response.status}`);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      return { isAuthenticated: false, needsLogin: true };
    }
  })
  .catch(error => {
    console.error('❌ [AUTH FIX] Auth check failed:', error);
    return { isAuthenticated: false, needsLogin: true };
  });
};

// Quick login function for testing
export const quickLogin = async (email = 'organizer@example.com', password = 'password123') => {
  try {
    console.log('🔍 [AUTH FIX] Attempting quick login...');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('authToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('✅ [AUTH FIX] Quick login successful');
      return { success: true, user: data.user };
    } else {
      console.error('❌ [AUTH FIX] Quick login failed:', response.status);
      return { success: false, error: response.status };
    }
  } catch (error) {
    console.error('❌ [AUTH FIX] Quick login error:', error);
    return { success: false, error: error.message };
  }
};
