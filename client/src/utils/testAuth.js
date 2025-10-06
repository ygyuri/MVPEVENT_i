// Test authentication helper for development
// This is only for testing purposes - remove in production

export const testAuth = {
  // Test user credentials
  testUser: {
    email: 'test@example.com',
    password: 'password123',
    username: 'testuser'
  },

  // Login with test user
  async login() {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.testUser.email,
          password: this.testUser.password
        })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('authToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('✅ Test user logged in successfully:', data.user);
      return data.user;
    } catch (error) {
      console.error('❌ Test login failed:', error);
      throw error;
    }
  },

  // Check if user is logged in
  isLoggedIn() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    console.log('✅ Test user logged out');
  },

  // Auto-login if not logged in (for testing)
  async ensureLoggedIn() {
    if (!this.isLoggedIn()) {
      console.log('🔐 Auto-logging in test user...');
      await this.login();
    }
    return this.getCurrentUser();
  }
};

// Auto-login for development (only in browser environment)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Check if we're on an organizer page
  const isOrganizerPage = window.location.pathname.includes('/organizer');
  
  if (isOrganizerPage && !testAuth.isLoggedIn()) {
    console.log('🚀 Auto-logging in for organizer page...');
    testAuth.ensureLoggedIn().catch(console.error);
  }
}

export default testAuth;

