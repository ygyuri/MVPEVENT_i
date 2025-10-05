import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { pollSocket } from '../services/websocket/PollSocketManager';
import { setConnectionStatus } from '../store/slices/pollsSlice';

export const usePollSocket = (eventId) => {
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatusLocal] = useState('disconnected');
  const { isAuthenticated } = useSelector(state => state.auth);
  const { realtime } = useSelector(state => state.polls);
  
  useEffect(() => {
    if (!eventId || !isAuthenticated) return;
    
    // Temporarily disable WebSocket to prevent connection errors
    // pollSocket.connect(eventId);
    
    const unsubscribe = pollSocket.on('connection:status', ({ status, reason, error }) => {
      setConnectionStatusLocal(status);
      dispatch(setConnectionStatus({ 
        isConnected: status === 'connected', 
        error: error?.message || reason 
      }));
    });
    
    return () => {
      unsubscribe();
      // Don't disconnect - let it stay connected for other components
    };
  }, [eventId, isAuthenticated, dispatch]);
  
  return {
    isConnected: realtime.isConnected,
    connectionStatus: realtime.isConnected ? 'connected' : 'disconnected',
    connectionError: realtime.connectionError,
    socket: pollSocket
  };
};
