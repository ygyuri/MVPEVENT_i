import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

const useSocket = (eventId, callbacks = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState(null);
  const { isAuthenticated, user, token } = useSelector(state => state.auth);
  const reconnectTimeoutRef = useRef(null);
  
  const {
    onUpdate = () => {},
    onReaction = () => {},
    onBacklog = () => {}
  } = callbacks;

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    if (!isAuthenticated || !user || !token || !eventId) {
      console.log('Socket connection skipped: missing auth or eventId');
      return;
    }

    console.log('Connecting to socket for event:', eventId);

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      setLastConnected(Date.now());
      
      // Join event room
      newSocket.emit('join:event', { eventId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionError({ message: `Disconnected: ${reason}` });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      setLastConnected(Date.now());
      
      // Rejoin event room
      newSocket.emit('join:event', { eventId });
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnect attempt:', attemptNumber);
      setReconnectAttempts(attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnect error:', error);
      setConnectionError(error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnect failed');
      setConnectionError({ message: 'Failed to reconnect after maximum attempts' });
    });

    // Event-specific events
    newSocket.on('event:update', (update) => {
      console.log('Received new update:', update);
      onUpdate(update);
    });

    newSocket.on('event:reaction', (data) => {
      console.log('Received reaction:', data);
      onReaction(data);
    });

    newSocket.on('event:backlog', (updates) => {
      console.log('Received backlog updates:', updates);
      onBacklog(updates);
    });

    setSocket(newSocket);

    return newSocket;
  }, [isAuthenticated, user, token, eventId]);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('Disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
      setReconnectAttempts(0);
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    console.log('Manual reconnect attempt');
    disconnect();
    
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts, disconnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Connect when dependencies change
  useEffect(() => {
    if (isAuthenticated && user && token && eventId) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, user, token, eventId, connect, disconnect]);

  return {
    socket,
    isConnected,
    connectionError,
    reconnectAttempts,
    maxReconnectAttempts,
    lastConnected,
    connect,
    disconnect,
    reconnect
  };
};

export { useSocket };
export default useSocket;