import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import AuthModal from '../components/AuthModal';
import authSlice from '../store/slices/authSlice';

// Mock the API
vi.mock('../utils/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

// Mock window.open
const mockWindowOpen = vi.fn();
const mockWindowClose = vi.fn();
const mockPostMessage = vi.fn();

describe('Google OAuth Login Flow', () => {
  let store;
  let mockNavigate;
  let mockOnClose;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });

    // Mock navigate
    mockNavigate = vi.fn();

    // Mock onClose
    mockOnClose = vi.fn();

    // Mock window.open
    global.window.open = mockWindowOpen;
    
    // Store actual listeners for message events
    const messageListeners = [];
    global.window.addEventListener = vi.fn((event, listener) => {
      if (event === 'message') {
        messageListeners.push(listener);
      }
    });
    global.window.removeEventListener = vi.fn((event, listener) => {
      if (event === 'message') {
        const index = messageListeners.indexOf(listener);
        if (index > -1) messageListeners.splice(index, 1);
      }
    });
    
    // Expose messageListeners for tests to access
    global.window._messageListeners = messageListeners;

    // Create a mock popup window
    const mockPopup = {
      closed: false,
      close: mockWindowClose,
    };
    mockWindowOpen.mockReturnValue(mockPopup);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should open Google OAuth popup when Continue with Google is clicked', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    const googleButton = screen.getByText(/continue with google/i);
    expect(googleButton).toBeInTheDocument();

    googleButton.click();

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google'),
      'google-login',
      expect.stringContaining('width=500')
    );
  });

  it('should store tokens and set user when OAuth callback succeeds', async () => {
    const mockOAuthUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      role: 'customer',
      emailVerified: true,
      lastLoginProvider: 'google',
    };

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    // Mock getCurrentUser API call
    const api = await import('../utils/api');
    api.default.get.mockResolvedValue({
      data: { user: mockOAuthUser },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    // Click Google button to register message listener
    const googleButton = screen.getByText(/continue with google/i);
    googleButton.click();

    // Wait a bit for listener to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate OAuth callback postMessage
    const oauthSuccessEvent = {
      origin: window.location.origin,
      data: {
        type: 'oauth-success',
        provider: 'google',
        payload: {
          user: mockOAuthUser,
          tokens: mockTokens,
          redirect: '/',
        },
      },
    };

    // Get the message listener that was registered
    const messageListeners = global.window._messageListeners || [];
    expect(messageListeners.length).toBeGreaterThan(0);
    const messageListener = messageListeners[messageListeners.length - 1];

    // Trigger the message listener
    await messageListener(oauthSuccessEvent);

    // Wait for state updates
    await waitFor(() => {
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user).toEqual(mockOAuthUser);
      expect(state.auth.authToken).toBe(mockTokens.accessToken);
    });

    // Verify tokens are stored in localStorage
    expect(localStorage.getItem('authToken')).toBe(mockTokens.accessToken);
    expect(localStorage.getItem('refreshToken')).toBe(mockTokens.refreshToken);

    // Verify getCurrentUser was called
    await waitFor(() => {
      expect(api.default.get).toHaveBeenCalledWith('/api/auth/me');
    });
  });

  it('should set user immediately from OAuth payload even if getCurrentUser fails', async () => {
    const mockOAuthUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      role: 'organizer',
      emailVerified: true,
      lastLoginProvider: 'google',
    };

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    // Mock getCurrentUser to fail
    const api = await import('../utils/api');
    api.default.get.mockRejectedValue(new Error('Network error'));

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    // Click Google button to register message listener
    const googleButton = screen.getByText(/continue with google/i);
    googleButton.click();

    // Wait a bit for listener to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate OAuth callback postMessage
    const oauthSuccessEvent = {
      origin: window.location.origin,
      data: {
        type: 'oauth-success',
        provider: 'google',
        payload: {
          user: mockOAuthUser,
          tokens: mockTokens,
          redirect: '/organizer/dashboard',
        },
      },
    };

    // Get the message listener
    const messageListeners = global.window._messageListeners || [];
    const messageListener = messageListeners[messageListeners.length - 1];

    // Trigger the message listener
    await messageListener(oauthSuccessEvent);

    // Wait for state updates - user should still be set from OAuth payload
    await waitFor(() => {
      const state = store.getState();
      // User should be set from OAuth payload
      expect(state.auth.user).toBeDefined();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.authToken).toBe(mockTokens.accessToken);
    });

    // Verify tokens are stored
    expect(localStorage.getItem('authToken')).toBe(mockTokens.accessToken);
  });

  it('should handle OAuth error messages', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    // Click Google button to register message listener
    const googleButton = screen.getByText(/continue with google/i);
    googleButton.click();

    // Wait a bit for listener to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate OAuth error postMessage
    const oauthErrorEvent = {
      origin: window.location.origin,
      data: {
        type: 'oauth-error',
        provider: 'google',
        message: 'Access denied by user',
        redirect: '/',
      },
    };

    // Get the message listener
    const addEventListenerCalls = global.window.addEventListener.mock.calls;
    const messageListener = addEventListenerCalls.find(
      (call) => call[0] === 'message'
    )?.[1];

    // Trigger the message listener
    await messageListener(oauthErrorEvent);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    // Verify state is not authenticated
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBeNull();
  });

  it('should not authenticate if tokens are missing from OAuth payload', async () => {
    const mockOAuthUser = {
      id: 'user123',
      email: 'test@example.com',
    };

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    // Click Google button to register message listener
    const googleButton = screen.getByText(/continue with google/i);
    googleButton.click();

    // Wait a bit for listener to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate OAuth callback with missing tokens
    const oauthSuccessEvent = {
      origin: window.location.origin,
      data: {
        type: 'oauth-success',
        provider: 'google',
        payload: {
          user: mockOAuthUser,
          tokens: null, // Missing tokens
          redirect: '/',
        },
      },
    };

    // Get the message listener
    const messageListeners = global.window._messageListeners || [];
    expect(messageListeners.length).toBeGreaterThan(0);
    const messageListener = messageListeners[messageListeners.length - 1];

    // Trigger the message listener
    await messageListener(oauthSuccessEvent);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/failed to receive authentication tokens/i)
      ).toBeInTheDocument();
    });

    // Verify state is not authenticated
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('should preserve user state if getCurrentUser fails but user exists', async () => {
    const mockOAuthUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      role: 'customer',
    };

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    // Mock getCurrentUser to fail
    const api = await import('../utils/api');
    api.default.get.mockRejectedValue({
      response: { status: 500, data: { error: 'Server error' } },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthModal isOpen={true} onClose={mockOnClose} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

    // Click Google button to register message listener
    const googleButton = screen.getByText(/continue with google/i);
    googleButton.click();

    // Wait a bit for listener to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate OAuth callback
    const oauthSuccessEvent = {
      origin: window.location.origin,
      data: {
        type: 'oauth-success',
        provider: 'google',
        payload: {
          user: mockOAuthUser,
          tokens: mockTokens,
          redirect: '/',
        },
      },
    };

    // Get the message listener
    const messageListeners = global.window._messageListeners || [];
    expect(messageListeners.length).toBeGreaterThan(0);
    const messageListener = messageListeners[messageListeners.length - 1];

    // Trigger the message listener
    await messageListener(oauthSuccessEvent);

    // Wait and verify user is still set even after getCurrentUser fails
    await waitFor(
      () => {
        const state = store.getState();
        expect(state.auth.user).toBeDefined();
        expect(state.auth.isAuthenticated).toBe(true);
      },
      { timeout: 2000 }
    );
  });
});

