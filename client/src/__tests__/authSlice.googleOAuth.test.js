import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, { setUser, setAuthToken, getCurrentUser, clearAuthRequestCache } from '../store/slices/authSlice';

// Mock the API module
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('AuthSlice - Google OAuth', () => {
  let store;
  let api;

  beforeEach(async () => {
    localStorage.clear();
    
    // Clear the request cache before each test
    clearAuthRequestCache();
    
    // Get fresh API mock for each test BEFORE creating store
    // This ensures the mock is available when authSlice initializes
    api = (await import('../utils/api')).default;
    vi.clearAllMocks();
    api.get.mockReset();
    
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Clear cache after each test to prevent interference
    clearAuthRequestCache();
  });

  it('should set user and isAuthenticated when setUser is dispatched', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      role: 'customer',
    };

    store.dispatch(setUser(mockUser));

    const state = store.getState().auth;
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should set isAuthenticated to false when setUser receives null', () => {
    // First set a user
    store.dispatch(setUser({ id: 'user123', email: 'test@example.com' }));
    expect(store.getState().auth.isAuthenticated).toBe(true);

    // Then clear it
    store.dispatch(setUser(null));
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.user).toBeNull();
  });

  it('should use localStorage token in getCurrentUser if Redux state is empty', async () => {
    const mockToken = 'localstorage-token';
    localStorage.setItem('authToken', mockToken);

    // Mock the API
    api.get.mockResolvedValue({
      data: {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      },
    });

    // Dispatch getCurrentUser
    await store.dispatch(getCurrentUser());

    // Verify API was called with the localStorage token
    expect(api.get).toHaveBeenCalledWith('/api/auth/me');
  });

  it('should set isAuthenticated to true when getCurrentUser.fulfilled', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    };

    // Set token first
    localStorage.setItem('authToken', 'test-token');
    store.dispatch(setAuthToken('test-token'));

    // Mock API
    api.get.mockResolvedValue({
      data: { user: mockUser },
    });

    // Dispatch getCurrentUser
    await store.dispatch(getCurrentUser());

    const state = store.getState().auth;
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should preserve user state if getCurrentUser fails but user exists', async () => {
    const existingUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    };

    // Set user first
    store.dispatch(setUser(existingUser));
    store.dispatch(setAuthToken('test-token'));
    localStorage.setItem('authToken', 'test-token');

    // Mock API to fail
    api.get.mockRejectedValue({
      response: { status: 500, data: { error: 'Server error' } },
    });

    // Dispatch getCurrentUser (should fail)
    await store.dispatch(getCurrentUser());

    // User should still exist
    const state = store.getState().auth;
    expect(state.user).toEqual(existingUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear auth state if getCurrentUser fails and no user exists', async () => {
    // Set only token, no user
    store.dispatch(setAuthToken('test-token'));
    localStorage.setItem('authToken', 'test-token');

    // Mock API to fail
    api.get.mockRejectedValue({
      response: { status: 401, data: { error: 'Unauthorized' } },
    });

    // Dispatch getCurrentUser (should fail)
    await store.dispatch(getCurrentUser());

    // Auth state should be cleared
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.authToken).toBeNull();
  });

  it('should handle OAuth flow: setUser then getCurrentUser', async () => {
    const oauthUser = {
      id: 'oauth-user',
      email: 'oauth@example.com',
      username: 'oauthuser',
      name: 'OAuth User',
      role: 'customer',
    };

    const freshUser = {
      id: 'oauth-user',
      email: 'oauth@example.com',
      username: 'oauthuser',
      name: 'OAuth User Updated',
      role: 'customer',
      emailVerified: true,
    };

    // Step 1: Set user from OAuth payload
    store.dispatch(setUser(oauthUser));
    expect(store.getState().auth.user).toEqual(oauthUser);
    expect(store.getState().auth.isAuthenticated).toBe(true);

    // Step 2: Set token
    store.dispatch(setAuthToken('oauth-token'));
    localStorage.setItem('authToken', 'oauth-token');

    // Step 3: Fetch fresh user data
    api.get.mockResolvedValue({
      data: { user: freshUser },
    });

    await store.dispatch(getCurrentUser());

    // User should be updated with fresh data
    const state = store.getState().auth;
    expect(state.user).toEqual(freshUser);
    expect(state.isAuthenticated).toBe(true);
  });
});

