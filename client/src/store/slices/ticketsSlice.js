import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchMyTickets = createAsyncThunk('tickets/fetchMy', async (params = {}, { rejectWithValue }) => {
  try {
    const { page = 1, limit = 10 } = params;
    const res = await api.get(`/api/tickets/my`, { params: { page, limit } });
    return res.data?.data || { tickets: [], pagination: { page, limit, total: 0, pages: 1 } };
  } catch (e) {
    return rejectWithValue(e.response?.data || { error: 'Failed to fetch tickets' });
  }
});

export const fetchTicketById = createAsyncThunk('tickets/fetchById', async (ticketId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/api/tickets/${ticketId}`);
    return res.data?.data;
  } catch (e) {
    return rejectWithValue(e.response?.data || { error: 'Failed to fetch ticket' });
  }
});

export const issueTicketQr = createAsyncThunk('tickets/issueQr', async ({ ticketId, rotate = false }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/tickets/${ticketId}/qr`, { rotate });
    return { ticketId, ...res.data?.data };
  } catch (e) {
    return rejectWithValue(e.response?.data || { error: 'Failed to issue QR' });
  }
});

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: {
    list: [],
    pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    loadingList: false,
    listError: null,
    byId: {},
    loadingById: {},
    errorById: {},
    qrByTicketId: {},
    issuingQr: {},
    issueError: {},
    statusFilter: 'all',
  },
  reducers: {
    clearTicketsState: (state) => {
      state.list = [];
      state.byId = {};
      state.qrByTicketId = {};
      state.pagination = { page: 1, limit: 10, total: 0, pages: 1 };
      state.listError = null;
      state.errorById = {};
      state.issueError = {};
      state.statusFilter = 'all';
    },
    setTicketsStatusFilter: (state, action) => {
      state.statusFilter = action.payload || 'all';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTickets.pending, (state) => {
        state.loadingList = true;
        state.listError = null;
      })
      .addCase(fetchMyTickets.fulfilled, (state, action) => {
        state.loadingList = false;
        state.list = action.payload.tickets || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchMyTickets.rejected, (state, action) => {
        state.loadingList = false;
        state.listError = action.payload || action.error;
      })
      .addCase(fetchTicketById.pending, (state, action) => {
        const id = action.meta.arg;
        state.loadingById[id] = true;
        state.errorById[id] = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        const ticket = action.payload;
        if (ticket?.id) state.byId[ticket.id] = ticket;
        if (ticket?.id) state.loadingById[ticket.id] = false;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        const id = action.meta.arg;
        state.loadingById[id] = false;
        state.errorById[id] = action.payload || action.error;
      })
      .addCase(issueTicketQr.pending, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.issuingQr[ticketId] = true;
        state.issueError[ticketId] = null;
      })
      .addCase(issueTicketQr.fulfilled, (state, action) => {
        const { ticketId, qr, expiresAt } = action.payload || {};
        state.issuingQr[ticketId] = false;
        if (qr) state.qrByTicketId[ticketId] = { qr, expiresAt };
      })
      .addCase(issueTicketQr.rejected, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.issuingQr[ticketId] = false;
        state.issueError[ticketId] = action.payload || action.error;
      });
  }
});

export const { clearTicketsState, setTicketsStatusFilter } = ticketsSlice.actions;
export default ticketsSlice.reducer;
