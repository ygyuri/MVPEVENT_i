import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchAttendees = createAsyncThunk(
  "bulkEmail/fetchAttendees",
  async ({ eventId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ eventId, page, limit });
      const res = await api.get(`/api/admin/communications/attendees?${params}`);
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to load attendees");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const saveDraft = createAsyncThunk(
  "bulkEmail/saveDraft",
  async (
    { id, subject, bodyHtml, eventId, recipientIds, attachments = [], inlineImages = [] },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.post("/api/admin/communications/drafts", {
        id: id || undefined,
        subject: subject ?? "",
        bodyHtml: bodyHtml ?? "",
        eventId: eventId || null,
        recipientType: "attendees",
        recipientIds: recipientIds || [],
        attachments,
        inlineImages: inlineImages || [],
      });
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to save draft");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const loadDraft = createAsyncThunk(
  "bulkEmail/loadDraft",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/admin/communications/${id}`);
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to load draft");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const sendBulkEmail = createAsyncThunk(
  "bulkEmail/sendBulkEmail",
  async (communicationId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/api/admin/communications/${communicationId}/send`);
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to send");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchProgress = createAsyncThunk(
  "bulkEmail/fetchProgress",
  async (communicationId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/admin/communications/${communicationId}/status`);
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to load status");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

const initialState = {
  eventId: null,
  attendees: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 1 },
  selectedAttendeeIds: [],
  draftId: null,
  draft: {
    subject: "",
    bodyHtml: "",
    attachments: [],
    inlineImages: [],
  },
  progress: null,
  loading: false,
  loadingAttendees: false,
  sending: false,
  error: null,
};

const bulkEmailSlice = createSlice({
  name: "bulkEmail",
  initialState,
  reducers: {
    setEventId(state, action) {
      state.eventId = action.payload;
      state.attendees = [];
      state.selectedAttendeeIds = [];
      state.pagination = initialState.pagination;
    },
    setSelectedAttendeeIds(state, action) {
      state.selectedAttendeeIds = action.payload || [];
    },
    toggleSelectAll(state, action) {
      const ids = action.payload;
      if (!ids || ids.length === 0) {
        state.selectedAttendeeIds = [];
        return;
      }
      const current = new Set(state.selectedAttendeeIds);
      const allSelected = ids.every((id) => current.has(id));
      if (allSelected) {
        state.selectedAttendeeIds = state.selectedAttendeeIds.filter((id) => !ids.includes(id));
      } else {
        const next = new Set(state.selectedAttendeeIds);
        ids.forEach((id) => next.add(id));
        state.selectedAttendeeIds = Array.from(next);
      }
    },
    toggleAttendee(state, action) {
      const id = action.payload;
      const idx = state.selectedAttendeeIds.indexOf(id);
      if (idx >= 0) {
        state.selectedAttendeeIds = state.selectedAttendeeIds.filter((x) => x !== id);
      } else {
        state.selectedAttendeeIds = [...state.selectedAttendeeIds, id];
      }
    },
    setDraft(state, action) {
      const { subject, bodyHtml, attachments, inlineImages } = action.payload || {};
      if (subject !== undefined) state.draft.subject = subject;
      if (bodyHtml !== undefined) state.draft.bodyHtml = bodyHtml;
      if (attachments !== undefined) state.draft.attachments = attachments;
      if (inlineImages !== undefined) state.draft.inlineImages = inlineImages;
    },
    setDraftId(state, action) {
      state.draftId = action.payload;
    },
    setProgress(state, action) {
      state.progress = action.payload;
    },
    clearProgress(state) {
      state.progress = null;
    },
    clearError(state) {
      state.error = null;
    },
    resetBulkEmail(state) {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendees.pending, (state) => {
        state.loadingAttendees = true;
        state.error = null;
      })
      .addCase(fetchAttendees.fulfilled, (state, action) => {
        state.loadingAttendees = false;
        state.attendees = action.payload.attendees || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchAttendees.rejected, (state, action) => {
        state.loadingAttendees = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(saveDraft.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveDraft.fulfilled, (state, action) => {
        state.loading = false;
        state.draftId = action.payload._id;
      })
      .addCase(saveDraft.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(loadDraft.fulfilled, (state, action) => {
        const c = action.payload;
        state.draftId = c._id;
        state.draft = {
          subject: c.subject || "",
          bodyHtml: c.bodyHtml || "",
          attachments: c.attachments || [],
          inlineImages: c.inlineImages || [],
        };
        state.eventId = c.eventId || null;
        state.selectedAttendeeIds = c.recipientIds || [];
      })
      .addCase(sendBulkEmail.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendBulkEmail.fulfilled, (state, action) => {
        state.sending = false;
        state.progress = {
          communicationId: action.payload.communicationId,
          jobId: action.payload.jobId,
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          status: "queued",
        };
      })
      .addCase(sendBulkEmail.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchProgress.fulfilled, (state, action) => {
        const d = action.payload;
        state.progress = {
          communicationId: d.communicationId,
          total: d.total,
          sent: d.sent,
          failed: d.failed,
          pending: d.pending,
          status: d.status,
          errors: d.errors || [],
        };
      });
  },
});

export const {
  setEventId,
  setSelectedAttendeeIds,
  toggleSelectAll,
  toggleAttendee,
  setDraft,
  setDraftId,
  setProgress,
  clearProgress,
  clearError,
  resetBulkEmail,
} = bulkEmailSlice.actions;

export default bulkEmailSlice.reducer;
