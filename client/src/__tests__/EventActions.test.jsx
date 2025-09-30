import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventActions from '../components/organizer/EventActions';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock dateUtils
jest.mock('../../utils/eventHelpers', () => ({
  dateUtils: {
    formatEventDate: (dates) => 'Dec 1, 2025',
    formatEventTime: (dates) => '10:00 AM - 6:00 PM',
  },
}));

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
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    
    render(
      <EventActions
        event={publishedEvent}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('View Event')).toBeInTheDocument();
    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByText('Clone Event')).toBeInTheDocument();
    expect(screen.getByText('Unpublish Event')).toBeInTheDocument();
    expect(screen.getByText('Cancel Event')).toBeInTheDocument();
    expect(screen.getByText('View Analytics')).toBeInTheDocument();
  });

  it('renders event actions for cancelled event', () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' };
    
    render(
      <EventActions
        event={cancelledEvent}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('View Event')).toBeInTheDocument();
    expect(screen.getByText('Clone Event')).toBeInTheDocument();
    expect(screen.getByText('Delete Event')).toBeInTheDocument();
  });

  it('handles action clicks', async () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
      />
    );

    const editButton = screen.getByText('Edit Event');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('edit', 'event1', mockEvent);
    });
  });

  it('handles publish action', async () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
      />
    );

    const publishButton = screen.getByText('Publish Event');
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('publish', 'event1', mockEvent);
    });
  });

  it('handles clone action', async () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
      />
    );

    const cloneButton = screen.getByText('Clone Event');
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('clone', 'event1', mockEvent);
    });
  });

  it('handles delete action', async () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' };
    
    render(
      <EventActions
        event={cancelledEvent}
        onAction={mockOnAction}
      />
    );

    const deleteButton = screen.getByText('Delete Event');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('delete', 'event1', cancelledEvent);
    });
  });

  it('renders in compact mode', () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
        compact={true}
      />
    );

    // In compact mode, should show fewer buttons
    expect(screen.queryByText('View Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Publish Event')).not.toBeInTheDocument();
  });

  it('shows loading state during action', () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
        actionLoading="publish"
      />
    );

    // Should show loading state for publish action
    expect(screen.getByText('Publishing...')).toBeInTheDocument();
  });

  it('handles view action', async () => {
    render(
      <EventActions
        event={mockEvent}
        onAction={mockOnAction}
      />
    );

    const viewButton = screen.getByText('View Event');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('view', 'event1', mockEvent);
    });
  });

  it('handles cancel action for published event', async () => {
    const publishedEvent = { ...mockEvent, status: 'published' };
    
    render(
      <EventActions
        event={publishedEvent}
        onAction={mockOnAction}
      />
    );

    const cancelButton = screen.getByText('Cancel Event');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('cancel', 'event1', publishedEvent);
    });
  });

  it('handles unpublish action', async () => {
    const publishedEvent = { ...mockEvent, status: 'published' };
    
    render(
      <EventActions
        event={publishedEvent}
        onAction={mockOnAction}
      />
    );

    const unpublishButton = screen.getByText('Unpublish Event');
    fireEvent.click(unpublishButton);

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('unpublish', 'event1', publishedEvent);
    });
  });
});

