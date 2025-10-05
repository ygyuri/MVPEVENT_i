import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import pollsReducer from '../store/slices/pollsSlice';
import PollAnalyticsDashboard from '../components/organizer/PollAnalyticsDashboard';

// Mock ResizeObserver used by Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
});

const renderWithStore = (ui, { preloadedState } = {}) => {
  const store = configureStore({ reducer: { polls: pollsReducer }, preloadedState });
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('PollAnalyticsDashboard', () => {
  it('renders summary cards and message when no polls', async () => {
    renderWithStore(<PollAnalyticsDashboard eventId="evt_1" />, {
      preloadedState: { polls: { polls: {}, activePolls: [], pollResults: {}, loading: { polls: false }, errors: { polls: null } } }
    });
    await waitFor(() => expect(screen.getByText(/No polls yet/i)).toBeInTheDocument());
  });

  it('renders poll chart when results exist', async () => {
    const poll = { poll_id: 'p1', question: 'Q1' };
    const results = {
      analytics: { total_votes: 10, participation_rate: 25 },
      results: {
        o1: { label: 'A', vote_count: 6, percentage: 60 },
        o2: { label: 'B', vote_count: 4, percentage: 40 }
      }
    };
    renderWithStore(<PollAnalyticsDashboard eventId="evt_1" />, {
      preloadedState: { polls: { polls: { p1: poll }, activePolls: ['p1'], pollResults: { p1: results }, loading: { polls: false }, errors: { polls: null } } }
    });
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    expect(screen.getByText(/10 votes/i)).toBeInTheDocument();
  });
});
