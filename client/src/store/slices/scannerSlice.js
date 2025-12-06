import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Error message mapping for user-friendly feedback
const getErrorMessage = (code, data = {}) => {
  const messages = {
    'INVALID_QR': {
      title: 'Invalid QR Code',
      message: 'The scanned QR code is not valid. Please ensure you\'re scanning a valid ticket QR code.',
      details: 'The QR code format is incorrect or corrupted.'
    },
    'TICKET_NOT_FOUND': {
      title: 'Ticket Not Found',
      message: 'This ticket could not be found in the system.',
      details: 'The ticket may have been deleted or the QR code is invalid.'
    },
    'TICKET_NOT_ACTIVE': {
      title: 'Ticket Not Active',
      message: 'This ticket is not active and cannot be used for entry.',
      details: 'The ticket status is not active. Please contact support.'
    },
    'ALREADY_USED': {
      title: 'Ticket Already Used',
      message: 'This ticket has already been scanned and used.',
      details: data.scannedAt ? `Scanned at: ${new Date(data.scannedAt).toLocaleString()}` : 'This ticket was previously used for entry.'
    },
    'QR_EXPIRED': {
      title: 'QR Code Expired',
      message: 'This QR code has expired and is no longer valid.',
      details: data.expiresAt ? `Expired at: ${new Date(data.expiresAt).toLocaleString()}` : 'Please request a new QR code from the ticket holder.'
    },
    'EVENT_NOT_STARTED': {
      title: 'Event Not Started',
      message: 'This event has not started yet. Scanning is not available.',
      details: data.validFrom ? `Event starts: ${new Date(data.validFrom).toLocaleString()}` : 'Please wait until the event starts.'
    },
    'EVENT_ENDED': {
      title: 'Event Ended',
      message: 'This event has ended. Scanning is no longer available.',
      details: data.validUntil ? `Event ended: ${new Date(data.validUntil).toLocaleString()}` : 'The event has concluded.'
    },
    'ACCESS_DENIED': {
      title: 'Access Denied',
      message: 'You do not have permission to scan tickets for this event.',
      details: 'Only event organizers, admins, or authorized staff can scan tickets.'
    },
    'RATE_LIMITED': {
      title: 'Too Many Requests',
      message: 'You are scanning too quickly. Please wait a moment before scanning again.',
      details: data.retryAfter ? `Please wait ${data.retryAfter} seconds.` : 'Please slow down your scanning rate.'
    },
    'NETWORK_ERROR': {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      details: 'The scan request could not be completed. Please try again when connected.'
    },
    'SERVER_ERROR': {
      title: 'Server Error',
      message: 'An error occurred on the server. Please try again later.',
      details: 'The server encountered an unexpected error processing your scan.'
    },
    'UNKNOWN_ERROR': {
      title: 'Scan Failed',
      message: 'An unexpected error occurred while processing the scan.',
      details: 'Please try again or contact support if the issue persists.'
    }
  };

  return messages[code] || messages['UNKNOWN_ERROR'];
};

export const validateScan = createAsyncThunk('scanner/validate', async ({ qr, location, device }, { rejectWithValue }) => {
  try {
    // Validate QR string before sending
    if (!qr || typeof qr !== 'string') {
      console.error('❌ Invalid QR string in validateScan:', { qr, type: typeof qr });
      const error = { 
        success: false, 
        error: 'Invalid QR code', 
        code: 'INVALID_QR',
        ...getErrorMessage('INVALID_QR')
      };
      return rejectWithValue(error);
    }
    
    const qrTrimmed = qr.trim();
    if (!qrTrimmed) {
      console.error('❌ Empty QR string after trim');
      const error = { 
        success: false, 
        error: 'Empty QR code', 
        code: 'INVALID_QR',
        ...getErrorMessage('INVALID_QR')
      };
      return rejectWithValue(error);
    }
    
    console.log('📤 Sending scan request:', { qrLength: qrTrimmed.length, qrPrefix: qrTrimmed.substring(0, 50), location });
    
    const res = await api.post(`/api/tickets/scan`, { qr: qrTrimmed, location, device });
    console.log('✅ Scan response received:', res.data);
    return res.data;
  } catch (e) {
    const status = e.response?.status;
    const data = e.response?.data || { success: false, error: 'Scan failed' };
    
    // Determine error code
    let errorCode = data.code || 'UNKNOWN_ERROR';
    
    // Map HTTP status codes to error codes
    if (status === 400) {
      errorCode = data.code || 'INVALID_QR';
    } else if (status === 403) {
      errorCode = 'ACCESS_DENIED';
    } else if (status === 404) {
      errorCode = 'TICKET_NOT_FOUND';
    } else if (status === 429) {
      errorCode = 'RATE_LIMITED';
      data.retryAfter = e.response?.headers?.['retry-after'];
    } else if (status >= 500) {
      errorCode = 'SERVER_ERROR';
    } else if (!e.response) {
      // Network error (no response)
      errorCode = 'NETWORK_ERROR';
    }
    
    // Enhance error with user-friendly messages
    const errorMessage = getErrorMessage(errorCode, data);
    const enhancedError = {
      ...data,
      code: errorCode,
      status,
      httpStatus: status,
      networkError: !e.response,
      ...errorMessage,
      originalError: e.message
    };
    
    console.error('❌ Scan request failed:', { 
      status, 
      code: errorCode,
      data: enhancedError, 
      error: e.message 
    });
    
    return rejectWithValue(enhancedError);
  }
});

// Offline queue helpers
const QUEUE_KEY = 'scanner_offline_queue_v1';
function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(queue) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

export const enqueueOfflineScan = createAsyncThunk('scanner/enqueue', async (payload) => {
  const queue = loadQueue();
  queue.push({ ...payload, enqueuedAt: Date.now() });
  saveQueue(queue);
  return queue.length;
});

export const flushOfflineQueue = createAsyncThunk('scanner/flushQueue', async (_, { dispatch }) => {
  const queue = loadQueue();
  const remaining = [];
  for (const item of queue) {
    try {
      await dispatch(validateScan(item)).unwrap();
    } catch (e) {
      remaining.push(item);
    }
  }
  saveQueue(remaining);
  return { flushed: queue.length - remaining.length, remaining: remaining.length };
});

// Fetch paginated recent scans from database
export const fetchRecentScans = createAsyncThunk('scanner/fetchRecentScans', async ({ page = 1, limit = 20, eventId = null }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (eventId) params.append('eventId', eventId);
    
    const res = await api.get(`/api/tickets/scans/recent?${params.toString()}`);
    return res.data.data;
  } catch (e) {
    console.error('❌ Failed to fetch recent scans:', e);
    return rejectWithValue(e.response?.data || { error: 'Failed to fetch recent scans' });
  }
});

const scannerSlice = createSlice({
  name: 'scanner',
  initialState: {
    scanning: false,
    lastResult: null,
    error: null,
    offlineCount: 0,
    recentScans: {
      scans: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false
      },
      loading: false,
      error: null
    }
  },
  reducers: {
    clearScan(state) {
      state.lastResult = null;
      state.error = null;
    },
    setScanning(state, action) {
      state.scanning = !!action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateScan.pending, (state) => {
        state.scanning = true;
        state.error = null;
      })
      .addCase(validateScan.fulfilled, (state, action) => {
        state.scanning = false;
        state.lastResult = action.payload;
      })
      .addCase(validateScan.rejected, (state, action) => {
        state.scanning = false;
        state.error = action.payload || action.error;
      })
      .addCase(enqueueOfflineScan.fulfilled, (state, action) => {
        state.offlineCount = action.payload;
      })
      .addCase(flushOfflineQueue.fulfilled, (state, action) => {
        state.offlineCount = action.payload.remaining;
      })
      .addCase(fetchRecentScans.pending, (state) => {
        state.recentScans.loading = true;
        state.recentScans.error = null;
      })
      .addCase(fetchRecentScans.fulfilled, (state, action) => {
        state.recentScans.loading = false;
        state.recentScans.scans = action.payload.scans;
        state.recentScans.pagination = action.payload.pagination;
      })
      .addCase(fetchRecentScans.rejected, (state, action) => {
        state.recentScans.loading = false;
        state.recentScans.error = action.payload;
      });
  }
});

export const { clearScan, setScanning, setError } = scannerSlice.actions;
export default scannerSlice.reducer;
