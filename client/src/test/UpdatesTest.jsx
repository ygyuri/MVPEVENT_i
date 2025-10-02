import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { OrganizerUpdatesDashboard, AttendeeUpdatesView } from '../pages/EventUpdates';

// Mock store for testing
const mockStore = configureStore({
  reducer: {
    auth: (state = { isAuthenticated: true, user: { _id: 'test-user', role: 'organizer' } }) => state,
    events: (state = { currentEvent: { id: 'test-event' } }) => state,
  },
});

// Test component to verify imports work
const TestUpdatesPage = () => {
  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold">Updates Feature Test</h1>
          
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Organizer Dashboard</h2>
            <OrganizerUpdatesDashboard eventId="test-event-123" />
          </div>
          
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Attendee View</h2>
            <AttendeeUpdatesView eventId="test-event-123" />
          </div>
        </div>
      </BrowserRouter>
    </Provider>
  );
};

export default TestUpdatesPage;
