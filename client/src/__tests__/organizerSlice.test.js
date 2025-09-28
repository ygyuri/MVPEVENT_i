import organizerSlice, {
  clearError,
  setCurrentEvent,
  clearCurrentEvent,
  setFilters,
  clearFilters,
  updateEventInList,
  removeEventFromList,
  addEventToList,
  setLoading,
} from '../store/slices/organizerSlice';
import {
  fetchMyEvents,
  createEventDraft,
  updateEventDraft,
  publishEvent,
  cancelEvent,
  unpublishEvent,
  cloneEvent,
  updateTicketTypes,
  getEventDetails,
  getOrganizerOverview,
  deleteEvent,
} from '../store/slices/organizerSlice';

describe('organizerSlice', () => {
  const initialState = organizerSlice.getInitialState();

  it('should return the initial state', () => {
    expect(organizerSlice.reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = organizerSlice.reducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle setCurrentEvent', () => {
    const event = { _id: 'event1', title: 'Test Event' };
    const actual = organizerSlice.reducer(initialState, setCurrentEvent(event));
    expect(actual.currentEvent).toEqual(event);
  });

  it('should handle clearCurrentEvent', () => {
    const stateWithEvent = { ...initialState, currentEvent: { _id: 'event1' } };
    const actual = organizerSlice.reducer(stateWithEvent, clearCurrentEvent());
    expect(actual.currentEvent).toBeNull();
  });

  it('should handle setFilters', () => {
    const filters = { status: 'published', search: 'test' };
    const actual = organizerSlice.reducer(initialState, setFilters(filters));
    expect(actual.filters).toEqual(filters);
  });

  it('should handle clearFilters', () => {
    const stateWithFilters = { ...initialState, filters: { status: 'published' } };
    const actual = organizerSlice.reducer(stateWithFilters, clearFilters());
    expect(actual.filters).toEqual({});
  });

  it('should handle updateEventInList', () => {
    const events = [
      { _id: 'event1', title: 'Event 1' },
      { _id: 'event2', title: 'Event 2' },
    ];
    const stateWithEvents = { ...initialState, events };
    const updatedEvent = { _id: 'event1', title: 'Updated Event 1' };
    const actual = organizerSlice.reducer(stateWithEvents, updateEventInList(updatedEvent));
    expect(actual.events[0]).toEqual(updatedEvent);
    expect(actual.events[1]).toEqual(events[1]);
  });

  it('should handle removeEventFromList', () => {
    const events = [
      { _id: 'event1', title: 'Event 1' },
      { _id: 'event2', title: 'Event 2' },
    ];
    const stateWithEvents = { ...initialState, events };
    const actual = organizerSlice.reducer(stateWithEvents, removeEventFromList('event1'));
    expect(actual.events).toHaveLength(1);
    expect(actual.events[0]._id).toBe('event2');
  });

  it('should handle addEventToList', () => {
    const events = [{ _id: 'event1', title: 'Event 1' }];
    const stateWithEvents = { ...initialState, events };
    const newEvent = { _id: 'event2', title: 'Event 2' };
    const actual = organizerSlice.reducer(stateWithEvents, addEventToList(newEvent));
    expect(actual.events).toHaveLength(2);
    expect(actual.events[0]).toEqual(newEvent);
  });

  it('should handle setLoading', () => {
    const actual = organizerSlice.reducer(initialState, setLoading({ key: 'events', loading: true }));
    expect(actual.loading.events).toBe(true);
  });

  describe('async thunks', () => {
    it('should handle fetchMyEvents.pending', () => {
      const actual = organizerSlice.reducer(initialState, fetchMyEvents.pending());
      expect(actual.loading.events).toBe(true);
      expect(actual.error).toBeNull();
    });

    it('should handle fetchMyEvents.fulfilled', () => {
      const mockResponse = {
        data: {
          items: [{ _id: 'event1', title: 'Event 1' }],
          pagination: { page: 1, totalPages: 1 },
        },
      };
      const actual = organizerSlice.reducer(initialState, fetchMyEvents.fulfilled(mockResponse));
      expect(actual.loading.events).toBe(false);
      expect(actual.events).toEqual(mockResponse.data.items);
      expect(actual.eventsPagination).toEqual(mockResponse.data.pagination);
    });

    it('should handle fetchMyEvents.rejected', () => {
      const error = 'Failed to fetch events';
      const actual = organizerSlice.reducer(initialState, fetchMyEvents.rejected(null, null, null, error));
      expect(actual.loading.events).toBe(false);
      expect(actual.error).toBe(error);
    });

    it('should handle createEventDraft.pending', () => {
      const actual = organizerSlice.reducer(initialState, createEventDraft.pending());
      expect(actual.loading.actions).toBe(true);
      expect(actual.error).toBeNull();
    });

    it('should handle createEventDraft.fulfilled', () => {
      const mockResponse = {
        data: { id: 'event1', version: 1, updatedAt: '2025-01-01T00:00:00Z' },
      };
      const mockArg = { title: 'New Event' };
      const actual = organizerSlice.reducer(
        initialState,
        createEventDraft.fulfilled(mockResponse, null, mockArg)
      );
      expect(actual.loading.actions).toBe(false);
      expect(actual.events).toHaveLength(1);
      expect(actual.events[0]._id).toBe('event1');
      expect(actual.events[0].title).toBe('New Event');
    });

    it('should handle updateEventDraft.fulfilled', () => {
      const events = [{ _id: 'event1', title: 'Event 1', version: 1 }];
      const stateWithEvents = { ...initialState, events };
      const mockResponse = { eventId: 'event1', data: { version: 2, updatedAt: '2025-01-01T00:00:00Z' } };
      const actual = organizerSlice.reducer(stateWithEvents, updateEventDraft.fulfilled(mockResponse));
      expect(actual.events[0].version).toBe(2);
    });

    it('should handle publishEvent.fulfilled', () => {
      const events = [{ _id: 'event1', title: 'Event 1', status: 'draft' }];
      const stateWithEvents = { ...initialState, events };
      const mockResponse = { eventId: 'event1', data: { slug: 'event-1' } };
      const actual = organizerSlice.reducer(stateWithEvents, publishEvent.fulfilled(mockResponse));
      expect(actual.events[0].status).toBe('published');
      expect(actual.events[0].slug).toBe('event-1');
    });

    it('should handle cancelEvent.fulfilled', () => {
      const events = [{ _id: 'event1', title: 'Event 1', status: 'published' }];
      const stateWithEvents = { ...initialState, events };
      const mockResponse = { eventId: 'event1', data: {} };
      const actual = organizerSlice.reducer(stateWithEvents, cancelEvent.fulfilled(mockResponse));
      expect(actual.events[0].status).toBe('cancelled');
    });

    it('should handle unpublishEvent.fulfilled', () => {
      const events = [{ _id: 'event1', title: 'Event 1', status: 'published' }];
      const stateWithEvents = { ...initialState, events };
      const mockResponse = { eventId: 'event1', data: { version: 2 } };
      const actual = organizerSlice.reducer(stateWithEvents, unpublishEvent.fulfilled(mockResponse));
      expect(actual.events[0].status).toBe('draft');
      expect(actual.events[0].version).toBe(2);
    });

    it('should handle cloneEvent.fulfilled', () => {
      const actual = organizerSlice.reducer(initialState, cloneEvent.fulfilled({ data: { id: 'event2' } }));
      expect(actual.loading.actions).toBe(false);
    });

    it('should handle updateTicketTypes.fulfilled', () => {
      const events = [{ _id: 'event1', title: 'Event 1', ticketTypes: [] }];
      const stateWithEvents = { ...initialState, events };
      const mockResponse = { eventId: 'event1', ticketTypes: [{ name: 'VIP', price: 100 }] };
      const actual = organizerSlice.reducer(stateWithEvents, updateTicketTypes.fulfilled(mockResponse));
      expect(actual.events[0].ticketTypes).toEqual(mockResponse.ticketTypes);
    });

    it('should handle getEventDetails.fulfilled', () => {
      const mockEvent = { _id: 'event1', title: 'Event 1' };
      const actual = organizerSlice.reducer(initialState, getEventDetails.fulfilled(mockEvent));
      expect(actual.loading.currentEvent).toBe(false);
      expect(actual.currentEvent).toEqual(mockEvent);
    });

    it('should handle getOrganizerOverview.fulfilled', () => {
      const mockOverview = { totalEvents: 5, publishedEvents: 3 };
      const actual = organizerSlice.reducer(initialState, getOrganizerOverview.fulfilled(mockOverview));
      expect(actual.loading.overview).toBe(false);
      expect(actual.overview).toEqual(mockOverview);
    });

    it('should handle deleteEvent.fulfilled', () => {
      const events = [
        { _id: 'event1', title: 'Event 1' },
        { _id: 'event2', title: 'Event 2' },
      ];
      const stateWithEvents = { ...initialState, events, currentEvent: events[0] };
      const mockResponse = { eventId: 'event1' };
      const actual = organizerSlice.reducer(stateWithEvents, deleteEvent.fulfilled(mockResponse));
      expect(actual.events).toHaveLength(1);
      expect(actual.events[0]._id).toBe('event2');
      expect(actual.currentEvent).toBeNull();
    });
  });
});
