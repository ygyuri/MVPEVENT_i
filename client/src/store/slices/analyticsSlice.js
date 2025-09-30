import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analyticsAPI from '../../utils/analyticsAPI';

// Async thunks for analytics functionality
export const fetchDashboardOverview = createAsyncThunk(
  'analytics/fetchDashboardOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getDashboardOverview();
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard');
    }
  }
);

export const fetchSalesChart = createAsyncThunk(
  'analytics/fetchSalesChart',
  async ({ eventId, options }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getSalesChart(eventId, options);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch sales data');
    }
  }
);

export const fetchRevenueOverview = createAsyncThunk(
  'analytics/fetchRevenueOverview',
  async ({ eventId }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRevenueOverview(eventId);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch revenue data');
    }
  }
);

export const fetchRevenueTrends = createAsyncThunk(
  'analytics/fetchRevenueTrends',
  async (options, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRevenueTrends(options);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch revenue trends');
    }
  }
);

export const exportAttendees = createAsyncThunk(
  'analytics/exportAttendees',
  async ({ eventId, options }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.exportAttendees(eventId, options);
      return response.data?.data || response.data; // GET may return data or metadata
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Export failed');
    }
  }
);

export const createExportJob = createAsyncThunk(
  'analytics/createExportJob',
  async ({ eventId, options }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.createExportJob(eventId, options);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create export job');
    }
  }
);

export const fetchEventSummary = createAsyncThunk(
  'analytics/fetchEventSummary',
  async ({ eventId }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getEventSummary(eventId);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch event summary');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    // Dashboard state
    dashboardData: null,
    dashboardLoading: false,
    dashboardError: null,
    
    // Sales chart state
    salesChartData: null,
    salesChartLoading: false,
    salesChartError: null,
    
    // Revenue state
    revenueData: null,
    revenueLoading: false,
    revenueError: null,
    
    // Revenue trends state
    revenueTrendsData: null,
    revenueTrendsLoading: false,
    revenueTrendsError: null,
    
    // Export state
    exportJobs: [],
    exportLoading: false,
    exportError: null,
    
    // Event summary state
    eventSummaryData: null,
    eventSummaryLoading: false,
    eventSummaryError: null,
    
    // UI state
    selectedEvent: null,
    dateRange: { start: null, end: null },
    period: 'daily',
    filters: {
      ticketType: 'all',
      paymentMethod: 'all',
      status: 'all'
    },
    lastUpdated: null,
    
    // Cache state
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  },
  reducers: {
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload;
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setPeriod: (state, action) => {
      state.period = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearAnalyticsError: (state) => {
      state.dashboardError = null;
      state.salesChartError = null;
      state.revenueError = null;
      state.revenueTrendsError = null;
      state.exportError = null;
      state.eventSummaryError = null;
    },
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    clearCache: (state) => {
      state.cache.clear();
    },
    removeExportJob: (state, action) => {
      state.exportJobs = state.exportJobs.filter(job => job.jobId !== action.payload);
    },
    updateExportJobStatus: (state, action) => {
      const { jobId, status, progress } = action.payload;
      const job = state.exportJobs.find(job => job.jobId === jobId);
      if (job) {
        job.status = status;
        job.progress = progress;
        if (status === 'completed') {
          job.completedAt = new Date().toISOString();
        }
      }
    }
  },
  extraReducers: (builder) => {
    // Dashboard overview
    builder
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardData = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      });
    
    // Sales chart
    builder
      .addCase(fetchSalesChart.pending, (state) => {
        state.salesChartLoading = true;
        state.salesChartError = null;
      })
      .addCase(fetchSalesChart.fulfilled, (state, action) => {
        state.salesChartLoading = false;
        state.salesChartData = action.payload;
      })
      .addCase(fetchSalesChart.rejected, (state, action) => {
        state.salesChartLoading = false;
        state.salesChartError = action.payload;
      });
    
    // Revenue overview
    builder
      .addCase(fetchRevenueOverview.pending, (state) => {
        state.revenueLoading = true;
        state.revenueError = null;
      })
      .addCase(fetchRevenueOverview.fulfilled, (state, action) => {
        state.revenueLoading = false;
        state.revenueData = action.payload;
      })
      .addCase(fetchRevenueOverview.rejected, (state, action) => {
        state.revenueLoading = false;
        state.revenueError = action.payload;
      });
    
    // Revenue trends
    builder
      .addCase(fetchRevenueTrends.pending, (state) => {
        state.revenueTrendsLoading = true;
        state.revenueTrendsError = null;
      })
      .addCase(fetchRevenueTrends.fulfilled, (state, action) => {
        state.revenueTrendsLoading = false;
        state.revenueTrendsData = action.payload;
      })
      .addCase(fetchRevenueTrends.rejected, (state, action) => {
        state.revenueTrendsLoading = false;
        state.revenueTrendsError = action.payload;
      });
    
    // Export attendees
    builder
      .addCase(exportAttendees.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })
      .addCase(exportAttendees.fulfilled, (state, action) => {
        state.exportLoading = false;
        // Add to export jobs if it's a job-based export
        if (action.payload.jobId) {
          state.exportJobs.push(action.payload);
        }
      })
      .addCase(exportAttendees.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });
    
    // Create export job
    builder
      .addCase(createExportJob.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })
      .addCase(createExportJob.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportJobs.push(action.payload);
      })
      .addCase(createExportJob.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });
    
    // Event summary
    builder
      .addCase(fetchEventSummary.pending, (state) => {
        state.eventSummaryLoading = true;
        state.eventSummaryError = null;
      })
      .addCase(fetchEventSummary.fulfilled, (state, action) => {
        state.eventSummaryLoading = false;
        state.eventSummaryData = action.payload;
      })
      .addCase(fetchEventSummary.rejected, (state, action) => {
        state.eventSummaryLoading = false;
        state.eventSummaryError = action.payload;
      });
  }
});

export const {
  setSelectedEvent,
  setDateRange,
  setPeriod,
  setFilters,
  clearAnalyticsError,
  updateLastUpdated,
  clearCache,
  removeExportJob,
  updateExportJobStatus
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
