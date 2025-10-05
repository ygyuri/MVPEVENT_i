import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import EventList from '../components/organizer/EventList';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock dateUtils
vi.mock('../../utils/eventHelpers', async () => {
  const actual = await vi.importActual('../../utils/eventHelpers');
  return {
    ...actual,
    dateUtils: {
      formatEventDate: () => 'Dec 1, 2025',
      formatEventTime: () => '10:00 AM - 6:00 PM',
    },
  };
});

// Test data
const mockEvents = [
  {
    _id: 'event1',
    title: 'Test Event 1',
    description: 'Test description 1',
    shortDescription: 'Short description 1',
    status: 'draft',
    dates: { startDate: '2025-12-01T10:00:00Z', endDate: '2025-12-01T18:00:00Z' },
    location: { venueName: 'Test Venue', city: 'Test City', country: 'Test Country' },
    capacity: 100,
    pricing: { isFree: true, price: 0 },
    attendees: [],
  },
  {
    _id: 'event2',
    title: 'Test Event 2',
    description: 'Test description 2',
    shortDescription: 'Short description 2',
    status: 'published',
    dates: { startDate: '2025-12-02T10:00:00Z', endDate: '2025-12-02T18:00:00Z' },
    location: { venueName: 'Test Venue 2', city: 'Test City 2', country: 'Test Country 2' },
    capacity: 50,
    pricing: { isFree: false, price: 25, currency: 'USD' },
    attendees: [],
  },
];

describe('EventList', () => {
  const mockOnEventAction = vi.fn();
  const mockOnEventSelect = vi.fn();
  const mockOnSelectAll = vi.fn();
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event list', () => {
    render(
      <EventList
        events={mockEvents}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <EventList
        events={[]}
        loading={true}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    // Check for loading skeletons
    expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(6);
  });

  it('shows error state', () => {
    render(
      <EventList
        events={[]}
        error={{ message: 'Failed to load events' }}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Failed to load events')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(
      <EventList
        events={[]}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('No events found')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Event')).toBeInTheDocument();
  });

  it('handles event selection', () => {
    render(
      <EventList
        events={mockEvents}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(mockOnEventSelect).toHaveBeenCalledWith('event1', true);
  });

  it('handles select all', () => {
    render(
      <EventList
        events={mockEvents}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectAll).toHaveBeenCalledWith(true);
  });

  it('handles sort change', () => {
    render(
      <EventList
        events={mockEvents}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    const sortButton = screen.getByText('Event');
    fireEvent.click(sortButton);

    expect(mockOnSortChange).toHaveBeenCalledWith('title');
  });

  it('displays event details correctly', () => {
    render(
      <EventList
        events={mockEvents}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    expect(screen.getByText('Short description 1')).toBeInTheDocument();
    expect(screen.getByText('Short description 2')).toBeInTheDocument();
    expect(screen.getByText('Test Venue, Test City')).toBeInTheDocument();
    expect(screen.getByText('Test Venue 2, Test City 2')).toBeInTheDocument();
    expect(screen.getByText('0 / 100 attendees')).toBeInTheDocument();
    expect(screen.getByText('0 / 50 attendees')).toBeInTheDocument();
  });

  it('handles compact mode', () => {
    render(
      <EventList
        events={mockEvents}
        compact={true}
        onEventAction={mockOnEventAction}
        onEventSelect={mockOnEventSelect}
        onSelectAll={mockOnSelectAll}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
  });
});

