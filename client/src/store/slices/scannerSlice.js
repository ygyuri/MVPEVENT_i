import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const validateScan = createAsyncThunk('scanner/validate', async ({ qr, location }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/tickets/scan`, { qr, location });
    return res.data;
  } catch (e) {
    return rejectWithValue(e.response?.data || { success: false, error: 'Scan failed' });
  }
});

const scannerSlice = createSlice({
  name: 'scanner',
  initialState: {
    scanning: false,
    lastResult: null,
    error: null,
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
      });
  }
});

export const { clearScan, setScanning } = scannerSlice.actions;
export default scannerSlice.reducer;
