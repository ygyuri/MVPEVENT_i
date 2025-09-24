import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const validateScan = createAsyncThunk('scanner/validate', async ({ qr, location, device }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/tickets/scan`, { qr, location, device });
    return res.data;
  } catch (e) {
    const status = e.response?.status;
    const data = e.response?.data || { success: false, error: 'Scan failed' };
    if (status === 429) {
      data.code = 'RATE_LIMITED';
      data.retryAfter = e.response?.headers?.['retry-after'];
    }
    return rejectWithValue(data);
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

const scannerSlice = createSlice({
  name: 'scanner',
  initialState: {
    scanning: false,
    lastResult: null,
    error: null,
    offlineCount: 0
  },
  reducers: {
    clearScan(state) {
      state.lastResult = null;
      state.error = null;
    },
    setScanning(state, action) {
      state.scanning = !!action.payload;
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
      });
  }
});

export const { clearScan, setScanning } = scannerSlice.actions;
export default scannerSlice.reducer;
