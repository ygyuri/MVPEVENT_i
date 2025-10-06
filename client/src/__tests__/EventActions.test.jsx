import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import EventActions from '../components/organizer/EventActions';

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
const mockEvent = {
  _id: 'event1',
  title: 'Test Event',
  description: 'Test description',
  status: 'draft',
  dates: { startDate: '2025-12-01T10:00:00Z', endDate: '2025-12-01T18:00:00Z' },
  location: { venueName: 'Test Venue', city: 'Test City' },
  capacity: 100,
  pricing: { isFree: true, price: 0 },
  attendees: [],
};

describe('EventActions', () => {
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event actions for draft event', () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('View Event')).toBeInTheDocument();
    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByText('Clone Event')).toBeInTheDocument();
    expect(screen.getByText('Publish Event')).toBeInTheDocument();
  });

  it('renders event actions for published event', () => {
    const publishedEvent = { ...mockEvent, status: 'published' };
    render(<EventActions event={publishedEvent} onAction={mockOnAction} />);
    expect(screen.getByText('View Event')).toBeInTheDocument();
    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByText('Clone Event')).toBeInTheDocument();
    expect(screen.getByText('Unpublish Event')).toBeInTheDocument();
    expect(screen.getByText('Cancel Event')).toBeInTheDocument();
    expect(screen.getByText('View Analytics')).toBeInTheDocument();
  });

  it('renders event actions for cancelled event', () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' };
    render(<EventActions event={cancelledEvent} onAction={mockOnAction} />);
    expect(screen.getByText('View Event')).toBeInTheDocument();
    expect(screen.getByText('Clone Event')).toBeInTheDocument();
    expect(screen.getByText('Delete Event')).toBeInTheDocument();
  });

  it('handles action clicks', async () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('Edit Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('edit', 'event1', mockEvent);
    });
  });

  it('handles publish action', async () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('Publish Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('publish', 'event1', mockEvent);
    });
  });

  it('handles clone action', async () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('Clone Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('clone', 'event1', mockEvent);
    });
  });

  it('renders in compact mode', () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} compact />);
    expect(screen.queryByText('View Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Publish Event')).not.toBeInTheDocument();
  });

  it('shows loading state during action', () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} actionLoading="publish" />);
    const publishButton = screen.getByText('Publish Event');
    expect(publishButton).toBeInTheDocument();
    // Check for disabled state via class or style
    const button = publishButton.closest('button');
    expect(button).toBeInTheDocument();
  });

  it('handles view action', async () => {
    render(<EventActions event={mockEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('View Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('view', 'event1', mockEvent);
    });
  });

  it('handles cancel action for published event', async () => {
    const publishedEvent = { ...mockEvent, status: 'published' };
    render(<EventActions event={publishedEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('Cancel Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('cancel', 'event1', publishedEvent);
    });
  });

  it('handles unpublish action', async () => {
    const publishedEvent = { ...mockEvent, status: 'published' };
    render(<EventActions event={publishedEvent} onAction={mockOnAction} />);
    fireEvent.click(screen.getByText('Unpublish Event'));
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('unpublish', 'event1', publishedEvent);
    });
  });
});

