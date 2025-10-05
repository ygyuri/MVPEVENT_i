import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pollApi } from '../../services/api/pollApi';

// Async thunks
export const fetchPolls = createAsyncThunk(
  'polls/fetchPolls',
  async ({ eventId, status = 'active' }, { rejectWithValue }) => {
    try {
      const data = await pollApi.listPolls(eventId, status);
      return data.polls;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch polls');
    }
  }
);

export const createPoll = createAsyncThunk(
  'polls/createPoll',
  async ({ eventId, pollData }, { rejectWithValue }) => {
    try {
      const data = await pollApi.createPoll(eventId, pollData);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create poll');
    }
  }
);

export const submitVote = createAsyncThunk(
  'polls/submitVote',
  async ({ pollId, optionIds }, { rejectWithValue }) => {
    try {
      const data = await pollApi.submitVote(pollId, optionIds);
      return { pollId, ...data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to submit vote');
    }
  }
);

export const fetchResults = createAsyncThunk(
  'polls/fetchResults',
  async ({ pollId }, { rejectWithValue }) => {
    try {
      const data = await pollApi.getResults(pollId);
      return { pollId, ...data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch results');
    }
  }
);

export const closePoll = createAsyncThunk(
  'polls/closePoll',
  async ({ pollId }, { rejectWithValue }) => {
    try {
      const data = await pollApi.closePoll(pollId);
      return { pollId, ...data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to close poll');
    }
  }
);

const initialState = {
  // Poll data indexed by poll_id
  polls: {},
  // Array of poll_ids for current event
  activePolls: [],
  // User votes indexed by poll_id
  userVotes: {},
  // Poll results indexed by poll_id
  pollResults: {},
  
  // UI state
  isCreatingPoll: false,
  isVoting: {},
  isFetchingResults: {},
  
  // Loading states
  loading: {
    polls: false,
    vote: false,
    results: false
  },
  
  // Error states
  errors: {
    polls: null,
    vote: null,
    results: null
  },
  
  // Real-time state
  realtime: {
    isConnected: false,
    connectionError: null,
    lastUpdate: null
  }
};

const pollsSlice = createSlice({
  name: 'polls',
  initialState,
  reducers: {
    // Real-time update handlers
    handleNewPoll: (state, action) => {
      const poll = action.payload;
      state.polls[poll.poll_id] = poll;
      if (!state.activePolls.includes(poll.poll_id)) {
        state.activePolls.push(poll.poll_id);
      }
    },
    
    handleVoteUpdate: (state, action) => {
      const { poll_id, total_votes, results } = action.payload;
      
      if (state.polls[poll_id]) {
        state.polls[poll_id].total_votes = total_votes;
      }
      
      if (state.pollResults[poll_id]) {
        state.pollResults[poll_id].results = results;
        state.pollResults[poll_id].analytics.total_votes = total_votes;
      }
    },
    
    handlePollClosed: (state, action) => {
      const { poll_id, final_results } = action.payload;
      
      if (state.polls[poll_id]) {
        state.polls[poll_id].status = 'closed';
        state.polls[poll_id].closed_at = new Date().toISOString();
      }
      
      if (state.pollResults[poll_id]) {
        state.pollResults[poll_id].results = final_results;
      }
      
      // Remove from active polls
      state.activePolls = state.activePolls.filter(id => id !== poll_id);
    },
    
    // Connection state
    setConnectionStatus: (state, action) => {
      state.realtime.isConnected = action.payload.isConnected;
      state.realtime.connectionError = action.payload.error || null;
    },
    
    // Clear errors
    clearError: (state, action) => {
      const { type } = action.payload;
      if (state.errors[type]) {
        state.errors[type] = null;
      }
    },
    
    // Clear all polls (for event change)
    clearPolls: (state) => {
      state.polls = {};
      state.activePolls = [];
      state.userVotes = {};
      state.pollResults = {};
      state.errors = { polls: null, vote: null, results: null };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch polls
      .addCase(fetchPolls.pending, (state) => {
        state.loading.polls = true;
        state.errors.polls = null;
      })
      .addCase(fetchPolls.fulfilled, (state, action) => {
        state.loading.polls = false;
        const pollsById = {};
        const activePollIds = [];
        const userVotes = {};
        
        action.payload.forEach(poll => {
          pollsById[poll.poll_id] = poll;
          activePollIds.push(poll.poll_id);
          
          if (poll.has_voted) {
            userVotes[poll.poll_id] = poll.user_vote;
          }
        });
        
        state.polls = { ...state.polls, ...pollsById };
        state.activePolls = activePollIds;
        state.userVotes = { ...state.userVotes, ...userVotes };
      })
      .addCase(fetchPolls.rejected, (state, action) => {
        state.loading.polls = false;
        state.errors.polls = action.payload;
      })
      
      // Create poll
      .addCase(createPoll.pending, (state) => {
        state.isCreatingPoll = true;
      })
      .addCase(createPoll.fulfilled, (state, action) => {
        state.isCreatingPoll = false;
        const newPoll = action.payload;
        state.polls[newPoll.poll_id] = newPoll;
        if (!state.activePolls.includes(newPoll.poll_id)) {
          state.activePolls.push(newPoll.poll_id);
        }
      })
      .addCase(createPoll.rejected, (state, action) => {
        state.isCreatingPoll = false;
        state.errors.polls = action.payload;
      })
      
      // Submit vote
      .addCase(submitVote.pending, (state, action) => {
        const pollId = action.meta.arg.pollId;
        state.isVoting[pollId] = true;
        state.errors.vote = null;
      })
      .addCase(submitVote.fulfilled, (state, action) => {
        const { pollId, optionIds } = action.payload;
        state.isVoting[pollId] = false;
        state.userVotes[pollId] = optionIds;
        
        if (state.polls[pollId]) {
          state.polls[pollId].has_voted = true;
          state.polls[pollId].user_vote = optionIds;
        }
      })
      .addCase(submitVote.rejected, (state, action) => {
        const pollId = action.meta.arg.pollId;
        state.isVoting[pollId] = false;
        state.errors.vote = action.payload;
      })
      
      // Fetch results
      .addCase(fetchResults.pending, (state, action) => {
        const pollId = action.meta.arg.pollId;
        state.isFetchingResults[pollId] = true;
        state.errors.results = null;
      })
      .addCase(fetchResults.fulfilled, (state, action) => {
        const { pollId, ...results } = action.payload;
        state.isFetchingResults[pollId] = false;
        state.pollResults[pollId] = results;
      })
      .addCase(fetchResults.rejected, (state, action) => {
        const pollId = action.meta.arg.pollId;
        state.isFetchingResults[pollId] = false;
        state.errors.results = action.payload;
      })
      
      // Close poll
      .addCase(closePoll.fulfilled, (state, action) => {
        const { pollId, final_results } = action.payload;
        
        if (state.polls[pollId]) {
          state.polls[pollId].status = 'closed';
          state.polls[pollId].closed_at = new Date().toISOString();
        }
        
        state.pollResults[pollId] = {
          ...state.pollResults[pollId],
          results: final_results
        };
        
        state.activePolls = state.activePolls.filter(id => id !== pollId);
      });
  }
});

export const {
  handleNewPoll,
  handleVoteUpdate,
  handlePollClosed,
  setConnectionStatus,
  clearError,
  clearPolls
} = pollsSlice.actions;

export default pollsSlice.reducer;
