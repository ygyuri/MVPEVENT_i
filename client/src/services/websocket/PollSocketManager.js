import { io } from 'socket.io-client';
import { store } from '../../store';
import { handleNewPoll, handleVoteUpdate, handlePollClosed, setConnectionStatus } from '../../store/slices/pollsSlice';

/**
 * Enhanced WebSocket Manager for Poll Real-time Features
 * Implements best practices for connection management, error handling, and reconnection
 */
class PollSocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connectionTimer = null;
    this.heartbeatTimer = null;
    this.isConnecting = false;
    this.isDisconnecting = false;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
    
    // Connection quality tracking
    this.connectionQuality = {
      lastSuccessfulConnection: null,
      consecutiveFailures: 0,
      totalConnections: 0,
      averageConnectionTime: 0
    };
  }

  /**
   * Connect to WebSocket with comprehensive error handling
   */
  async connect(eventId) {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting || this.isDisconnecting) {
      console.log('[PollSocket] Connection already in progress, skipping...');
      return;
    }

    // If already connected, just join the event room
    if (this.socket?.connected && this.connectionState === 'connected') {
      console.log('[PollSocket] Already connected, joining event room...');
      this.joinEventRoom(eventId);
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const apiUrl = this.getApiUrl();
      console.log(`[PollSocket] Attempting to connect to ${apiUrl}...`);

      // Create socket with enhanced configuration
      this.socket = io(apiUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        upgrade: true,
        rememberUpgrade: true,
        reconnection: false, // We handle reconnection manually for better control
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
        
        // Connection quality settings
        pingTimeout: 60000,
        pingInterval: 25000,
        
        // Query parameters for debugging
        query: {
          clientType: 'web',
          version: '1.0.0',
          timestamp: Date.now()
        }
      });

      this.setupEventListeners(eventId);
      this.updateConnectionStatus('connecting', null);

    } catch (error) {
      console.error('[PollSocket] Connection setup failed:', error);
      this.handleConnectionError(error);
      this.isConnecting = false;
    }
  }

  /**
   * Setup comprehensive event listeners
   */
  setupEventListeners(eventId) {
    if (!this.socket) return;

    // Connection success
    this.socket.on('connect', () => {
      console.log('[PollSocket] ✅ Connected successfully');
      this.isConnecting = false;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.connectionQuality.consecutiveFailures = 0;
      this.connectionQuality.lastSuccessfulConnection = Date.now();
      this.connectionQuality.totalConnections++;
      
      this.updateConnectionStatus('connected', null);
      this.startHeartbeat();
      this.joinEventRoom(eventId);
    });

    // Connection failure
    this.socket.on('connect_error', (error) => {
      console.error('[PollSocket] ❌ Connection failed:', error);
      this.isConnecting = false;
      this.connectionState = 'error';
      this.connectionQuality.consecutiveFailures++;
      
      this.handleConnectionError(error);
    });

    // Disconnection
    this.socket.on('disconnect', (reason, details) => {
      console.log(`[PollSocket] 🔌 Disconnected: ${reason}`, details);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      
      this.updateConnectionStatus('disconnected', reason);
      
      // Handle different disconnection reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect(eventId);
      } else if (reason === 'io client disconnect') {
        // Client initiated disconnect, don't reconnect
        console.log('[PollSocket] Client initiated disconnect, not reconnecting');
      } else {
        // Network issues, try to reconnect
        this.scheduleReconnect(eventId);
      }
    });

    // Authentication errors
    this.socket.on('auth_error', (error) => {
      console.error('[PollSocket] 🔐 Authentication failed:', error);
      this.handleAuthError(error);
    });

    // Poll-specific events
    this.socket.on('new_poll', (data) => {
      console.log('[PollSocket] 📊 New poll received:', data);
      this.handleNewPoll(data);
    });

    this.socket.on('vote_update', (data) => {
      console.log('[PollSocket] 🗳️ Vote update received:', data);
      this.handleVoteUpdate(data);
    });

    this.socket.on('poll_closed', (data) => {
      console.log('[PollSocket] 🔒 Poll closed:', data);
      this.handlePollClosed(data);
    });

    this.socket.on('poll_updated', (data) => {
      console.log('[PollSocket] ✏️ Poll updated:', data);
      this.handlePollUpdated(data);
    });

    // Server heartbeat
    this.socket.on('ping', () => {
      this.socket.emit('pong');
    });

    // Connection quality events
    this.socket.on('connect_timeout', () => {
      console.warn('[PollSocket] ⏱️ Connection timeout');
      this.updateConnectionStatus('error', 'Connection timeout');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[PollSocket] 🔄 Reconnection attempt ${attemptNumber}`);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('[PollSocket] 💥 Socket error:', error);
      this.updateConnectionStatus('error', error.message);
    });
  }

  /**
   * Join event room for poll updates
   */
  joinEventRoom(eventId) {
    if (!this.socket?.connected || !eventId) return;
    
    console.log(`[PollSocket] 🏠 Joining event room: ${eventId}`);
    this.socket.emit('join:event', { eventId });
  }

  /**
   * Leave event room
   */
  leaveEventRoom(eventId) {
    if (!this.socket?.connected || !eventId) return;
    
    console.log(`[PollSocket] 🚪 Leaving event room: ${eventId}`);
    this.socket.emit('leave:event', { eventId });
  }

  /**
   * Join specific poll room for granular updates
   */
  joinPoll(pollId) {
    if (!this.socket?.connected || !pollId) return;
    
    console.log(`[PollSocket] 📊 Joining poll room: ${pollId}`);
    this.socket.emit('join:poll', { pollId });
  }

  /**
   * Leave specific poll room
   */
  leavePoll(pollId) {
    if (!this.socket?.connected || !pollId) return;
    
    console.log(`[PollSocket] 📊 Leaving poll room: ${pollId}`);
    this.socket.emit('leave:poll', { pollId });
  }

  /**
   * Handle connection errors with intelligent retry logic
   */
  handleConnectionError(error) {
    const errorMessage = error.message || error.toString();
    
    // Handle specific error types
    if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
      this.handleAuthError(error);
      return;
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      console.warn('[PollSocket] 🔐 Access forbidden, clearing token');
      this.clearAuthToken();
      this.updateConnectionStatus('error', 'Access forbidden');
      return;
    }
    
    if (errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED')) {
      console.warn('[PollSocket] 🌐 Network error, will retry');
      this.updateConnectionStatus('error', 'Network error');
      return;
    }

    // Generic error handling
    this.updateConnectionStatus('error', errorMessage);
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error) {
    console.error('[PollSocket] 🔐 Authentication error:', error);
    this.clearAuthToken();
    this.updateConnectionStatus('error', 'Authentication failed');
    
    // Notify listeners about auth failure
    this.notifyListeners('auth:failed', error);
  }

  /**
   * Schedule intelligent reconnection
   */
  scheduleReconnect(eventId) {
    if (this.isDisconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[PollSocket] ❌ Max reconnection attempts reached or disconnecting');
      return;
    }

    const delay = this.calculateReconnectDelay();
    console.log(`[PollSocket] 🔄 Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.connectionTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(eventId);
    }, delay);
  }

  /**
   * Calculate exponential backoff with jitter
   */
  calculateReconnectDelay() {
    const exponentialDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      } else {
        console.warn('[PollSocket] 💓 Heartbeat failed - socket not connected');
        this.stopHeartbeat();
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Graceful disconnection
   */
  async disconnect() {
    console.log('[PollSocket] 🔌 Disconnecting...');
    this.isDisconnecting = true;
    this.connectionState = 'disconnected';
    
    // Clear timers
    this.stopHeartbeat();
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    this.isDisconnecting = false;
    this.updateConnectionStatus('disconnected', 'Client disconnect');
    
    console.log('[PollSocket] ✅ Disconnected successfully');
  }

  /**
   * Update connection status in Redux store
   */
  updateConnectionStatus(status, reason) {
    const connectionInfo = {
      isConnected: status === 'connected',
      status,
      reason,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionQuality: this.connectionQuality
    };

    store.dispatch(setConnectionStatus(connectionInfo));
    this.notifyListeners('connection:status', connectionInfo);
  }

  /**
   * Handle new poll event
   */
  handleNewPoll(data) {
    store.dispatch(handleNewPoll(data));
    this.notifyListeners('poll:created', data);
  }

  /**
   * Handle vote update event
   */
  handleVoteUpdate(data) {
    store.dispatch(handleVoteUpdate(data));
    this.notifyListeners('poll:vote_update', data);
  }

  /**
   * Handle poll closed event
   */
  handlePollClosed(data) {
    store.dispatch(handlePollClosed(data));
    this.notifyListeners('poll:closed', data);
  }

  /**
   * Handle poll updated event
   */
  handlePollUpdated(data) {
    // You might want to add a new action for this
    this.notifyListeners('poll:updated', data);
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`[PollSocket] Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
  }

  /**
   * Get API URL from environment or fallback
   */
  getApiUrl() {
    // Use VITE_API_URL if available (for Docker environments)
    if (import.meta.env.VITE_API_URL) {
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log('🔌 WebSocket API URL (VITE_API_URL):', apiUrl);
      return apiUrl;
    }
    
    // Check if we're in development
    if (import.meta.env.DEV) {
      const devUrl = 'http://localhost:5000';
      console.log('🔌 WebSocket API URL (Development):', devUrl);
      return devUrl;
    }
    
    // Production: use same origin (relative URL)
    console.log('🔌 WebSocket API URL (Production - Same Origin):', '');
    return '';
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected && this.connectionState === 'connected';
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return {
      state: this.connectionState,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      quality: this.connectionQuality
    };
  }

  /**
   * Force reconnection (useful for debugging)
   */
  forceReconnect(eventId) {
    console.log('[PollSocket] 🔄 Force reconnection requested');
    this.reconnectAttempts = 0;
    this.disconnect().then(() => {
      setTimeout(() => this.connect(eventId), 1000);
    });
  }

  /**
   * Get connection diagnostics
   */
  getDiagnostics() {
    return {
      connectionState: this.connectionState,
      isConnecting: this.isConnecting,
      isDisconnecting: this.isDisconnecting,
      reconnectAttempts: this.reconnectAttempts,
      connectionQuality: this.connectionQuality,
      socketId: this.socket?.id,
      socketConnected: this.socket?.connected,
      listeners: Array.from(this.listeners.keys())
    };
  }
}

// Singleton instance
export const pollSocket = new PollSocketManager();

// Export class for testing
export { PollSocketManager };