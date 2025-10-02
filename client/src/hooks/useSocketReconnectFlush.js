import { useEffect } from 'react';

const useSocketReconnectFlush = (socket, eventId) => {
  useEffect(() => {
    if (!socket || !eventId) return;

    const handleReconnect = () => {
      console.log(`Socket reconnected for event ${eventId}. Requesting missed updates.`);
      socket.emit('reconnect:flush', { eventId });
    };

    socket.on('reconnect', handleReconnect);
    socket.on('connect', handleReconnect); // Also flush on initial connect

    return () => {
      socket.off('reconnect', handleReconnect);
      socket.off('connect', handleReconnect);
    };
  }, [socket, eventId]);
};

export { useSocketReconnectFlush };
export default useSocketReconnectFlush;