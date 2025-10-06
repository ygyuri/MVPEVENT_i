import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import pollsReducer from '../store/slices/pollsSlice';
import ActivePollsWidget from '../components/attendee/ActivePollsWidget';

// Mock the usePollSocket hook
vi.mock('../hooks/usePollSocket', () => ({
  usePollSocket: vi.fn(() => ({
    isConnected: false,
    socket: null
  }))
}));

const authReducer = (state = { isAuthenticated: false, user: null, token: null }, action) => state;

const renderWithStore = (ui, { preloadedState } = {}) => {
  const defaultState = {
    polls: { 
      polls: {}, 
      activePolls: [], 
      loading: { polls: false, voting: {} },
      isVoting: {},
      isFetchingResults: {},
      userVotes: {},
      errors: { polls: null, vote: null }, 
      realtime: { isConnected: false } 
    },
    auth: { isAuthenticated: false, user: null, token: null }
  };
  
  // Create a mock dispatch that doesn't actually do anything
  const mockDispatch = vi.fn((action) => {
    if (typeof action === 'function') {
      return Promise.resolve();
    }
    return action;
  });
  
  const store = configureStore({ 
    reducer: { polls: pollsReducer, auth: authReducer }, 
    preloadedState: {
      ...defaultState,
      ...preloadedState,
      polls: {
        ...defaultState.polls,
        ...(preloadedState?.polls || {})
      }
    }
  });
  
  // Override dispatch to prevent API calls during tests
  const originalDispatch = store.dispatch;
  store.dispatch = (action) => {
    // Allow regular actions but block async thunks
    if (action && typeof action.type === 'string' && !action.type.includes('/pending')) {
      return originalDispatch(action);
    }
    return mockDispatch(action);
  };
  
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
      preloadedState: { 
        polls: { 
          polls: {}, 
          activePolls: [], 
          loading: { polls: false, voting: {} },
          isVoting: {},
          isFetchingResults: {},
          userVotes: {},
          errors: { polls: null, vote: null }, 
          realtime: { isConnected: false } 
        } 
      }
    });
    
    expect(screen.getByText(/No active polls at the moment/i)).toBeInTheDocument();
  });

  it('renders poll cards when active polls exist', () => {
    const poll = { 
      poll_id: 'p1', 
      question: 'Q?', 
      status: 'active', 
      max_votes: 1, 
      options_json: [{ id: 'o1', label: 'A' }],
      created_at: new Date().toISOString()
    };
    
    const { container } = renderWithStore(<ActivePollsWidget eventId="evt_1" />, {
      preloadedState: { 
        polls: { 
          polls: { p1: poll }, 
          activePolls: ['p1'], 
          loading: { polls: false, voting: {} },
          isVoting: {},
          isFetchingResults: {},
          userVotes: {},
          errors: { polls: null, vote: null }, 
          realtime: { isConnected: true } 
        } 
      }
    });
    
    // Debug - let's see what's actually rendered
    // console.log(container.innerHTML);
    
    expect(screen.getByText('Active Polls')).toBeInTheDocument();
    expect(screen.getByText('Q?')).toBeInTheDocument();
  });
});
