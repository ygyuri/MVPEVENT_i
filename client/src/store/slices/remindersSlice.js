import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { getUserReminders, updateReminderPreferences, cancelReminder } from '../../utils/remindersAPI';

export const fetchReminders = createAsyncThunk('reminders/fetch', async (userId) => {
  const res = await getUserReminders(userId);
  return res.data || [];
});

export const setReminderPreferences = createAsyncThunk('reminders/setPreferences', async ({ id, deliveryMethod }) => {
  const res = await updateReminderPreferences(id, { deliveryMethod });
  return res.data;
});

export const deleteReminder = createAsyncThunk('reminders/delete', async (id) => {
  await cancelReminder(id);
  return id;
});

const remindersSlice = createSlice({
  name: 'reminders',
  initialState: {
    items: [],
    loading: false,
    error: null,
    // UI state
    filters: {
      status: 'all', // all | pending | queued | sent | failed | cancelled
      method: 'all', // all | email | sms | both
      query: '', // matches event title
      from: null,
      to: null
    },
    selection: {}, // id -> boolean
    page: 1,
    pageSize: 10,
    sort: { field: 'scheduledTime', direction: 'desc' }
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setPage(state, action) {
      state.page = action.payload || 1;
    },
    setPageSize(state, action) {
      state.pageSize = action.payload || 10;
      state.page = 1;
    },
    toggleSelect(state, action) {
      const id = action.payload;
      state.selection[id] = !state.selection[id];
    },
    clearSelection(state) {
      state.selection = {};
    },
    selectAllOnPage(state, action) {
      const ids = action.payload || [];
      for (const id of ids) state.selection[id] = true;
    },
    setSort(state, action) {
      state.sort = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReminders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchReminders.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchReminders.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      .addCase(setReminderPreferences.fulfilled, (state, action) => {
        const idx = state.items.findIndex(r => r.id === action.payload.id || r._id === action.payload.id);
        if (idx >= 0) state.items[idx] = { ...state.items[idx], ...action.payload };
      })

      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.items = state.items.filter(r => (r.id || r._id) !== action.payload);
      });
  }
});

export const selectReminders = (state) => state.reminders.items;
export const selectUi = (state) => state.reminders;

const applyFilters = (items, { filters }) => {
  return items.filter(r => {
    const statusOk = filters.status === 'all' ? true : r.status === filters.status;
    const methodOk = filters.method === 'all' ? true : (r.deliveryMethod === filters.method);
    const queryOk = filters.query ? (r.eventId?.title || '').toLowerCase().includes(filters.query.toLowerCase()) : true;
    const fromOk = filters.from ? new Date(r.scheduledTime) >= new Date(filters.from) : true;
    const toOk = filters.to ? new Date(r.scheduledTime) <= new Date(filters.to) : true;
    return statusOk && methodOk && queryOk && fromOk && toOk;
  });
};

const applySort = (items, { sort }) => {
  const sorted = items.slice().sort((a, b) => {
    const av = a[sort.field];
    const bv = b[sort.field];
    const an = new Date(av).getTime();
    const bn = new Date(bv).getTime();
    return sort.direction === 'asc' ? an - bn : bn - an;
  });
  return sorted;
};

export const selectFilteredReminders = createSelector([selectReminders, selectUi], (items, ui) => {
  return applySort(applyFilters(items, ui), ui);
});

export const selectPageData = createSelector([selectFilteredReminders, selectUi], (items, ui) => {
  const start = (ui.page - 1) * ui.pageSize;
  const paged = items.slice(start, start + ui.pageSize);
  return { items: paged, total: items.length, page: ui.page, pageSize: ui.pageSize };
});

export const selectCounts = createSelector([selectReminders], (items) => {
  const counts = { all: items.length };
  for (const s of ['pending', 'queued', 'sent', 'failed', 'cancelled']) {
    counts[s] = items.filter(i => i.status === s).length;
  }
  return counts;
});

export const { setFilters, setPage, setPageSize, toggleSelect, clearSelection, selectAllOnPage, setSort } = remindersSlice.actions;

export default remindersSlice.reducer;




