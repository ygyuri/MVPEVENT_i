import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import pollsReducer from '../store/slices/pollsSlice';
import ActivePollsWidget from '../components/attendee/ActivePollsWidget';

const authReducer = (state = { isAuthenticated: false, user: null }, action) => state;

const renderWithStore = (ui, { preloadedState } = {}) => {
  const store = configureStore({ reducer: { polls: pollsReducer, auth: authReducer }, preloadedState });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </Provider>
  );
};

describe('ActivePollsWidget', () => {
  it('shows empty state when no active polls', () => {
    renderWithStore(<ActivePollsWidget eventId="evt_1" />, {
      preloadedState: { polls: { polls: {}, activePolls: [], loading: { polls: false }, errors: { polls: null }, realtime: { isConnected: false } } }
    });
    expect(screen.getByText(/No active polls/i)).toBeInTheDocument();
  });

  it('renders poll cards when active polls exist', () => {
    const poll = { poll_id: 'p1', question: 'Q?', status: 'active', max_votes: 1, options_json: [{ id: 'o1', label: 'A' }] };
    renderWithStore(<ActivePollsWidget eventId="evt_1" />, {
      preloadedState: { polls: { polls: { p1: poll }, activePolls: ['p1'], loading: { polls: false }, errors: { polls: null }, realtime: { isConnected: true } } }
    });
    expect(screen.getByText('Active Polls')).toBeInTheDocument();
    expect(screen.getByText('Q?')).toBeInTheDocument();
  });
});
