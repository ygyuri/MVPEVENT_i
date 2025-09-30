import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import EventManagement from '../pages/EventManagement';
import organizerSlice from '../store/slices/organizerSlice';
import authSlice from '../store/slices/authSlice';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      organizer: organizerSlice.reducer,
      auth: authSlice.reducer,
    },
    preloadedState: {
      organizer: {
        events: [],
        loading: { events: false, actions: false },
        error: null,
        overview: null,
        ...initialState.organizer,
      },
      auth: {
        user: { _id: 'test-user', firstName: 'Test', lastName: 'User' },
        ...initialState.auth,
      },
    },
  });
};

// Test data
const mockEvents = [
  {
    _id: 'event1',
    title: 'Test Event 1',
    description: 'Test description 1',
    status: 'draft',
    dates: { startDate: '2025-12-01T10:00:00Z', endDate: '2025-12-01T18:00:00Z' },
    location: { venueName: 'Test Venue', city: 'Test City' },
    capacity: 100,
    pricing: { isFree: true, price: 0 },
    attendees: [],
  },
  {
    _id: 'event2',
    title: 'Test Event 2',
    description: 'Test description 2',
    status: 'published',
    dates: { startDate: '2025-12-02T10:00:00Z', endDate: '2025-12-02T18:00:00Z' },
    location: { venueName: 'Test Venue 2', city: 'Test City 2' },
    capacity: 50,
    pricing: { isFree: false, price: 25, currency: 'USD' },
    attendees: [],
  },
];

// Mock API calls
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

describe('EventManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event management page', () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Event Management')).toBeInTheDocument();
    expect(screen.getByText('Create Event')).toBeInTheDocument();
  });

  it('displays events list', () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const store = createTestStore({
      organizer: { loading: { events: true } },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    // Check for loading skeletons
    expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(6);
  });

  it('shows error state', () => {
    const store = createTestStore({
      organizer: { error: 'Failed to load events' },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Failed to load events')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    const store = createTestStore({
      organizer: { events: [] },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('No events found')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Event')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search events by title, description, or venue...');
    fireEvent.change(searchInput, { target: { value: 'Test Event 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Event 2')).not.toBeInTheDocument();
    });
  });

  it('handles status filtering', () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    const draftFilter = screen.getByText('Drafts');
    fireEvent.click(draftFilter);

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Event 2')).not.toBeInTheDocument();
  });

  it('handles event selection', () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  it('handles bulk actions', async () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    // Select events
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Click bulk delete
    const bulkDeleteButton = screen.getByText('Delete');
    fireEvent.click(bulkDeleteButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  it('navigates to create event', () => {
    const store = createTestStore({
      organizer: { events: mockEvents },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <EventManagement />
        </BrowserRouter>
      </Provider>
    );

    const createButton = screen.getByText('Create Event');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/organizer/events/create');
  });
});

