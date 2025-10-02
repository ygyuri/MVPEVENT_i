import React from 'react';
import { useParams } from 'react-router-dom';
import { UpdatesFeed } from '../components/updates/UpdatesFeed';
import { NotificationProvider, NotificationContainer } from '../components/updates/Notifications';
import { ConnectionStatus } from '../components/updates/ConnectionStatus';
import { useRegisterDevice } from '../hooks/useRegisterDevice';
import { useSocketReconnectFlush } from '../hooks/useSocketReconnectFlush';

// Main Updates Page Component
export const EventUpdatesPage = ({ 
  eventId, 
  userRole = 'attendee',
  onNewUpdate = () => {},
  onUpdateReaction = () => {}
}) => {
  // Register device for push notifications
  useRegisterDevice({ enabled: true });

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Event Updates
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Stay connected with real-time updates from the organizer
                </p>
              </div>
              
              {/* Connection Status */}
              <ConnectionStatus 
                isConnected={true} // This would come from useSocket hook
                connectionError={null}
                viewerCount={42}
                reconnectAttempts={0}
                maxReconnectAttempts={5}
                onReconnect={() => {}}
                lastConnected={Date.now()}
              />
            </div>
          </div>

          {/* Updates Feed */}
          <UpdatesFeed
            eventId={eventId}
            userRole={userRole}
            onNewUpdate={onNewUpdate}
            onUpdateReaction={onUpdateReaction}
            autoRefreshInterval={30000} // 30 seconds
          />
        </div>

        {/* Notification Container */}
        <NotificationContainer />
      </div>
    </NotificationProvider>
  );
};

// Organizer Updates Dashboard
export const OrganizerUpdatesDashboard = ({ eventId: propEventId }) => {
  const params = useParams();
  const eventId = propEventId || params.eventId;
  const handleNewUpdate = (update) => {
    console.log('New update created:', update);
  };

  const handleUpdateReaction = (updateId, reactionType) => {
    console.log('Update reaction:', updateId, reactionType);
  };

  return (
    <EventUpdatesPage
      eventId={eventId}
      userRole="organizer"
      onNewUpdate={handleNewUpdate}
      onUpdateReaction={handleUpdateReaction}
    />
  );
};

// Attendee Updates View
export const AttendeeUpdatesView = ({ eventId: propEventId }) => {
  const params = useParams();
  const eventId = propEventId || params.eventId;
  const handleNewUpdate = (update) => {
    console.log('Received new update:', update);
  };

  const handleUpdateReaction = (updateId, reactionType) => {
    console.log('Reacted to update:', updateId, reactionType);
  };

  return (
    <EventUpdatesPage
      eventId={eventId}
      userRole="attendee"
      onNewUpdate={handleNewUpdate}
      onUpdateReaction={handleUpdateReaction}
    />
  );
};

// Mobile-optimized Updates Component
export const MobileUpdatesView = ({ eventId, userRole = 'attendee' }) => {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Updates
            </h1>
            <div className="flex items-center gap-2">
              {/* Mobile connection status */}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Feed */}
        <div className="px-4 py-4">
          <UpdatesFeed
            eventId={eventId}
            userRole={userRole}
            onNewUpdate={() => {}}
            onUpdateReaction={() => {}}
          />
        </div>

        {/* Mobile Notification Container */}
        <NotificationContainer />
      </div>
    </NotificationProvider>
  );
};

// Updates Widget for embedding in other pages
export const UpdatesWidget = ({ 
  eventId, 
  userRole = 'attendee',
  maxHeight = '400px',
  showHeader = true 
}) => {
  return (
    <NotificationProvider>
      <div className={`
        rounded-xl border overflow-hidden
        ${showHeader ? 'bg-white dark:bg-gray-800' : 'bg-transparent'}
      `}>
        {showHeader && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Updates
            </h3>
          </div>
        )}
        
        <div style={{ maxHeight }} className="overflow-y-auto">
          <UpdatesFeed
            eventId={eventId}
            userRole={userRole}
            onNewUpdate={() => {}}
            onUpdateReaction={() => {}}
          />
        </div>

        <NotificationContainer />
      </div>
    </NotificationProvider>
  );
};

export default EventUpdatesPage;
