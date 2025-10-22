import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Helper to build query string safely
const buildQuery = (params = {}) => {
  const safe = { ...params };
  // Remove non-query fields
  delete safe.signal;
  delete safe.abortController;
  // Strip empty/void values
  Object.keys(safe).forEach((key) => {
    const value = safe[key];
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isVoid = value === undefined || value === null;
    if (isVoid || isEmptyString) {
      delete safe[key];
    }
  });
  return new URLSearchParams(safe).toString();
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (arg = {}, { rejectWithValue, signal }) => {
    try {
      const params = Array.isArray(arg) || typeof arg === 'string' ? {} : arg;
      const queryParams = buildQuery(params);
      const response = await api.get(`/api/events?${queryParams}`, { signal });
      return response.data;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch events');
    }
  }
);

export const fetchFeaturedEvents = createAsyncThunk(
  'events/fetchFeaturedEvents',
  async (params = {}, { rejectWithValue, signal }) => {
    try {
      const { page = 1, pageSize = 12 } = params;
      const queryParams = new URLSearchParams({ page, pageSize }).toString();
      const response = await api.get(`/api/events/featured?${queryParams}`, { signal });
      return response.data;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch featured events');
    }
  }
);

export const fetchTrendingEvents = createAsyncThunk(
  'events/fetchTrendingEvents',
  async (_, { rejectWithValue, signal }) => {
    try {
      const response = await api.get('/api/events/trending', { signal });
      return response.data.events;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch trending events');
    }
  }
);

export const fetchSuggestedEvents = createAsyncThunk(
  'events/fetchSuggestedEvents',
  async (params = {}, { rejectWithValue, signal }) => {
    try {
      const { page = 1, pageSize = 12 } = params;
      const queryParams = new URLSearchParams({ page, pageSize }).toString();
      const response = await api.get(`/api/events/suggested?${queryParams}`, { signal });
      return response.data;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch suggested events');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'events/fetchCategories',
  async (_, { rejectWithValue, signal }) => {
    try {
      const response = await api.get('/api/events/categories', { signal });
      return response.data.categories;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch categories');
    }
  }
);

export const fetchEventDetails = createAsyncThunk(
  'events/fetchEventDetails',
  async (slug, { rejectWithValue, signal }) => {
    try {
      const response = await api.get(`/api/events/${slug}`, { signal });
      return response.data.event;
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch event details');
    }
  }
);

export const fetchEventTickets = createAsyncThunk(
  'events/fetchEventTickets',
  async (slug, { rejectWithValue, signal }) => {
    try {
      const response = await api.get(`/api/events/${slug}/tickets`, { signal });
      return { slug, tickets: response.data.ticketTypes };
    } catch (error) {
      if (error?.name === 'CanceledError') {
        return rejectWithValue('cancelled');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tickets');
    }
  }
);

export const purchaseTickets = createAsyncThunk(
  'events/purchaseTickets',
  async ({ slug, ticketTypeName, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${slug}/purchase`, {
        userId: '000000000000000000000001', // MVP: dummy user ID
        ticketTypeName,
        quantity
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Purchase failed');
    }
  }
);

const initialState = {
  events: [],
  featuredEvents: [],
  trendingEvents: [],
  suggestedEvents: [],
  categories: [],
  currentEvent: null,
  tickets: [],
  loading: false,
  error: null,
  meta: {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    hasMore: false
  },
  featuredMeta: {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    hasMore: false
  },
  suggestedMeta: {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    hasMore: false
  }
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetEvents: (state) => {
      state.events = [];
      state.meta = initialState.meta;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Events
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        // Normalize meta to our expected shape
        const meta = action.payload.meta || {};
        state.meta = {
          page: meta.page ?? 1,
          pageSize: meta.pageSize ?? 12,
          total: meta.total ?? 0,
          totalPages: meta.totalPages ?? 1,
          hasMore: meta.hasMore ?? Boolean(meta.page < meta.totalPages)
        };
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        if (action.payload === 'cancelled') return; // ignore cancellations
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Featured Events
      .addCase(fetchFeaturedEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeaturedEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredEvents = action.payload.events;
        // Update featured pagination metadata
        const meta = action.payload.meta || {};
        state.featuredMeta = {
          page: meta.page ?? 1,
          pageSize: meta.pageSize ?? 12,
          total: meta.total ?? 0,
          totalPages: meta.totalPages ?? 1,
          hasMore: meta.hasMore ?? Boolean(meta.page < meta.totalPages)
        };
      })
      .addCase(fetchFeaturedEvents.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Trending Events
      .addCase(fetchTrendingEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTrendingEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.trendingEvents = action.payload;
      })
      .addCase(fetchTrendingEvents.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Suggested Events
      .addCase(fetchSuggestedEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSuggestedEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.suggestedEvents = action.payload.events;
        // Update suggested pagination metadata
        const meta = action.payload.meta || {};
        state.suggestedMeta = {
          page: meta.page ?? 1,
          pageSize: meta.pageSize ?? 12,
          total: meta.total ?? 0,
          totalPages: meta.totalPages ?? 1,
          hasMore: meta.hasMore ?? Boolean(meta.page < meta.totalPages)
        };
      })
      .addCase(fetchSuggestedEvents.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Event Details
      .addCase(fetchEventDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload;
        state.error = null;
      })
      .addCase(fetchEventDetails.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Event Tickets
      .addCase(fetchEventTickets.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEventTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.tickets;
      })
      .addCase(fetchEventTickets.rejected, (state, action) => {
        if (action.payload === 'cancelled') return;
        state.loading = false;
        state.error = action.payload;
      })

      // Purchase Tickets
      .addCase(purchaseTickets.pending, (state) => {
        state.loading = true;
      })
      .addCase(purchaseTickets.fulfilled, (state, action) => {
        state.loading = false;
        // Could update tickets availability here
      })
      .addCase(purchaseTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, resetEvents } = eventsSlice.actions;
export default eventsSlice.reducer;
