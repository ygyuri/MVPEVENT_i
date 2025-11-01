import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Request deduplication cache
const requestCache = new Map();

// Async thunks for organizer functionality
export const fetchMyEvents = createAsyncThunk(
  "organizer/fetchMyEvents",
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      const {
        status,
        page = 1,
        pageSize = 12,
        sort = "createdAt",
        order = "desc",
        search,
        dateRange,
      } = params;

      // Check if admin is impersonating an organizer
      const state = getState();
      const impersonatingUserId = localStorage.getItem("impersonatingUserId");
      const isAdmin = state.auth.user?.role === "admin";

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort,
        order,
      });

      if (status && status !== "all") queryParams.append("status", status);
      if (search) queryParams.append("search", search);
      if (dateRange && dateRange !== "all")
        queryParams.append("dateRange", dateRange);

      // Add organizerId for admin impersonation
      if (isAdmin && impersonatingUserId) {
        queryParams.append("organizerId", impersonatingUserId);
      }

      const requestKey = `/api/organizer/events?${queryParams}`;
      const now = Date.now();

      // Check if we have a recent request for the same URL
      if (requestCache.has(requestKey)) {
        const lastRequest = requestCache.get(requestKey);
        if (now - lastRequest < 2000) {
          // 2 seconds cache
          console.log(
            "🚫 [API FETCH EVENTS] Deduplicating request:",
            requestKey
          );
          return new Promise((resolve) => {
            // Return cached promise or wait for ongoing request
            setTimeout(() => {
              resolve(requestCache.get(requestKey + "_result"));
            }, 100);
          });
        }
      }

      // Store request timestamp
      requestCache.set(requestKey, now);

      console.log("🔄 [API FETCH EVENTS] Request:", {
        url: requestKey,
        method: "GET",
        params: { status, page, pageSize, sort, order, search, dateRange },
        timestamp: new Date().toISOString(),
      });

      const response = await api.get(requestKey);

      // Store result in cache
      requestCache.set(requestKey + "_result", response.data);

      console.log("✅ [API FETCH EVENTS] Response:", {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      console.error("❌ [API FETCH EVENTS] Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to fetch events";
      return rejectWithValue(errorMessage);
    }
  }
);

export const createEventDraft = createAsyncThunk(
  "organizer/createEventDraft",
  async (eventData, { rejectWithValue }) => {
    try {
      console.log("🚀 [API CREATE DRAFT] Request:", {
        url: "/api/organizer/events",
        method: "POST",
        payload: eventData,
        timestamp: new Date().toISOString(),
      });

      const response = await api.post("/api/organizer/events", eventData);

      console.log("✅ [API CREATE DRAFT] Response:", {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      console.error("❌ [API CREATE DRAFT] Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to create draft";
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateEventDraft = createAsyncThunk(
  "organizer/updateEventDraft",
  async ({ eventId, eventData, version }, { rejectWithValue }) => {
    try {
      const payload = { ...eventData };
      if (version !== undefined) payload.version = version;

      console.log("🔄 [API UPDATE DRAFT] Request:", {
        url: `/api/organizer/events/${eventId}`,
        method: "PATCH",
        eventId,
        version,
        payload,
        timestamp: new Date().toISOString(),
      });

      const response = await api.patch(
        `/api/organizer/events/${eventId}`,
        payload
      );

      console.log("✅ [API UPDATE DRAFT] Response:", {
        status: response.status,
        data: response.data,
        eventId,
        timestamp: new Date().toISOString(),
      });

      return { eventId, ...response.data };
    } catch (error) {
      console.error("❌ [API UPDATE DRAFT] Error:", {
        eventId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update draft";
      return rejectWithValue(errorMessage);
    }
  }
);

export const publishEvent = createAsyncThunk(
  "organizer/publishEvent",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/api/organizer/events/${eventId}/publish`
      );
      return { eventId, ...response.data };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to publish event";
      return rejectWithValue(errorMessage);
    }
  }
);

export const cancelEvent = createAsyncThunk(
  "organizer/cancelEvent",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/api/organizer/events/${eventId}/cancel`
      );
      return { eventId, ...response.data };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to cancel event";
      return rejectWithValue(errorMessage);
    }
  }
);

export const unpublishEvent = createAsyncThunk(
  "organizer/unpublishEvent",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/api/organizer/events/${eventId}/unpublish`
      );
      return { eventId, ...response.data };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to unpublish event";
      return rejectWithValue(errorMessage);
    }
  }
);

export const cloneEvent = createAsyncThunk(
  "organizer/cloneEvent",
  async ({ eventId, options = {} }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/api/organizer/events/${eventId}/clone`,
        options
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to clone event";
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateTicketTypes = createAsyncThunk(
  "organizer/updateTicketTypes",
  async ({ eventId, ticketTypes }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/api/organizer/events/${eventId}/tickets`,
        { ticketTypes }
      );
      return { eventId, ticketTypes: response.data.data.ticketTypes };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update ticket types";
      return rejectWithValue(errorMessage);
    }
  }
);

// Generic partial update for any event fields (title, description, dates, location, pricing, flags, media, ticketTypes, tags, metadata, qrSettings, recurrence)
export const updateEventFields = createAsyncThunk(
  "organizer/updateEventFields",
  async ({ eventId, fields, version }, { rejectWithValue }) => {
    try {
      const payload = { ...fields };
      if (version !== undefined) payload.version = version;
      const response = await api.patch(
        `/api/organizer/events/${eventId}`,
        payload
      );
      return { eventId, data: response.data.data };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update event";
      return rejectWithValue(errorMessage);
    }
  }
);

// Upload event images (draft only). Accepts a FileList or array of Files
export const uploadEventImages = createAsyncThunk(
  "organizer/uploadEventImages",
  async ({ eventId, files }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      (Array.from(files) || []).forEach((file) =>
        formData.append("images", file)
      );
      const response = await api.post(
        `/api/organizer/events/${eventId}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return { eventId, urls: response.data?.data?.urls || [] };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to upload images";
      return rejectWithValue(errorMessage);
    }
  }
);

export const getEventDetails = createAsyncThunk(
  "organizer/getEventDetails",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/organizer/events/${eventId}`);
      return response.data.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to get event details";
      return rejectWithValue(errorMessage);
    }
  }
);

export const getOrganizerOverview = createAsyncThunk(
  "organizer/getOverview",
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if admin is impersonating an organizer
      const state = getState();
      const impersonatingUserId = localStorage.getItem("impersonatingUserId");
      const isAdmin = state.auth.user?.role === "admin";

      let requestKey = "/api/organizer/overview";
      if (isAdmin && impersonatingUserId) {
        requestKey = `${requestKey}?organizerId=${impersonatingUserId}`;
      }

      const now = Date.now();

      // Check if we have a recent request for the same URL
      if (requestCache.has(requestKey)) {
        const lastRequest = requestCache.get(requestKey);
        if (now - lastRequest < 10000) {
          // 10 seconds cache for overview
          console.log("🚫 [API OVERVIEW] Deduplicating request:", requestKey);
          return new Promise((resolve) => {
            // Return cached promise or wait for ongoing request
            setTimeout(() => {
              resolve(requestCache.get(requestKey + "_result"));
            }, 100);
          });
        }
      }

      // Store request timestamp
      requestCache.set(requestKey, now);

      console.log("🔄 [API OVERVIEW] Request:", {
        url: requestKey,
        timestamp: new Date().toISOString(),
      });

      const response = await api.get(requestKey);

      // Store result in cache
      requestCache.set(requestKey + "_result", response.data.overview);

      console.log("✅ [API OVERVIEW] Response:", {
        status: response.status,
        data: response.data.overview,
        timestamp: new Date().toISOString(),
      });

      return response.data.overview;
    } catch (error) {
      console.error("❌ [API OVERVIEW] Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to get overview";
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  "organizer/deleteEvent",
  async (eventId, { rejectWithValue }) => {
    try {
      console.log("🗑️ [API DELETE EVENT] Request:", {
        url: `/api/organizer/events/${eventId}`,
        method: "DELETE",
        eventId,
        timestamp: new Date().toISOString(),
      });

      const response = await api.delete(`/api/organizer/events/${eventId}`);

      console.log("✅ [API DELETE EVENT] Response:", {
        status: response.status,
        data: response.data,
        eventId,
        timestamp: new Date().toISOString(),
      });

      return { eventId, ...response.data };
    } catch (error) {
      console.error("❌ [API DELETE EVENT] Error:", {
        eventId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete event";
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  // Event management
  events: [],
  currentEvent: null,
  eventsPagination: {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    hasMore: false,
  },

  // Overview stats
  overview: {
    myEventsCount: 0,
  },

  // Loading states
  loading: {
    events: false,
    currentEvent: false,
    overview: false,
    actions: false,
  },

  // Error states
  error: null,
  lastRefresh: null,

  // Filters and search
  filters: {
    status: null,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  },
};

const organizerSlice = createSlice({
  name: "organizer",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },

    setCurrentEvent: (state, action) => {
      state.currentEvent = action.payload;
    },

    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },

    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {
        status: null,
        search: "",
        sortBy: "createdAt",
        sortOrder: "desc",
      };
    },

    refreshEvents: (state) => {
      // This will trigger a re-fetch in the component
      state.lastRefresh = Date.now();
    },

    updateEventInList: (state, action) => {
      const { eventId, updates } = action.payload;
      const eventIndex = state.events.findIndex(
        (event) => event._id === eventId
      );
      if (eventIndex !== -1) {
        state.events[eventIndex] = { ...state.events[eventIndex], ...updates };
      }
    },

    removeEventFromList: (state, action) => {
      const eventId = action.payload;
      state.events = state.events.filter((event) => event._id !== eventId);
    },

    addEventToList: (state, action) => {
      state.events.unshift(action.payload);
    },

    setLoading: (state, action) => {
      const { key, loading } = action.payload;
      state.loading[key] = loading;
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch My Events
      .addCase(fetchMyEvents.pending, (state) => {
        state.loading.events = true;
        state.error = null;
      })
      .addCase(fetchMyEvents.fulfilled, (state, action) => {
        state.loading.events = false;
        const data = action.payload && (action.payload.data || action.payload);
        state.events = data?.items || [];
        state.eventsPagination = data?.pagination || state.eventsPagination;
      })
      .addCase(fetchMyEvents.rejected, (state, action) => {
        state.loading.events = false;
        state.error = action.payload;
      })

      // Create Event Draft
      .addCase(createEventDraft.pending, (state) => {
        state.loading.actions = true;
        state.error = null;
      })
      .addCase(createEventDraft.fulfilled, (state, action) => {
        state.loading.actions = false;
        // Add the new event to the beginning of the list
        state.events.unshift({
          _id: action.payload.data.id,
          status: "draft",
          version: action.payload.data.version,
          updatedAt: action.payload.data.updatedAt,
          ...action.meta.arg,
        });
      })
      .addCase(createEventDraft.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      })

      // Update Event Draft
      .addCase(updateEventDraft.pending, (state) => {
        state.loading.actions = true;
        state.error = null;
      })
      .addCase(updateEventDraft.fulfilled, (state, action) => {
        state.loading.actions = false;
        const { eventId, data } = action.payload;

        // Update in events list
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex] = {
            ...state.events[eventIndex],
            version: data.version,
            updatedAt: data.updatedAt,
          };
        }

        // Update current event if it's the same
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent = {
            ...state.currentEvent,
            version: data.version,
            updatedAt: data.updatedAt,
          };
        }
      })
      .addCase(updateEventDraft.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      })

      // Publish Event
      .addCase(publishEvent.pending, (state) => {
        state.loading.actions = true;
        state.error = null;
      })
      .addCase(publishEvent.fulfilled, (state, action) => {
        state.loading.actions = false;
        const { eventId, data } = action.payload;

        // Update event status in list
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex].status = "published";
          if (data.slug) {
            state.events[eventIndex].slug = data.slug;
          }
        }

        // Update current event if it's the same
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent.status = "published";
          if (data.slug) {
            state.currentEvent.slug = data.slug;
          }
        }
      })
      .addCase(publishEvent.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      })

      // Cancel Event
      .addCase(cancelEvent.fulfilled, (state, action) => {
        const { eventId, data } = action.payload;

        // Update event status in list
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex].status = data.status;
        }

        // Update current event if it's the same
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent.status = data.status;
        }
      })

      // Unpublish Event
      .addCase(unpublishEvent.fulfilled, (state, action) => {
        const { eventId, data } = action.payload;

        // Update event status in list
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex].status = data.status;
          state.events[eventIndex].version = data.version;
        }

        // Update current event if it's the same
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent.status = data.status;
          state.currentEvent.version = data.version;
        }
      })

      // Clone Event
      .addCase(cloneEvent.fulfilled, (state, action) => {
        // The cloned event will be added to the list when the user navigates to it
        // or when they fetch the events list again
      })

      // Update Ticket Types
      .addCase(updateTicketTypes.fulfilled, (state, action) => {
        const { eventId, ticketTypes } = action.payload;

        // Update ticket types in events list
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex].ticketTypes = ticketTypes;
        }

        // Update current event if it's the same
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent.ticketTypes = ticketTypes;
        }
      })

      // Update Event Fields (generic partial update)
      .addCase(updateEventFields.fulfilled, (state, action) => {
        const { eventId, data } = action.payload;
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          state.events[eventIndex] = { ...state.events[eventIndex], ...data };
        }
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent = { ...state.currentEvent, ...data };
        }
      })

      // Upload Event Images
      .addCase(uploadEventImages.fulfilled, (state, action) => {
        const { eventId, urls } = action.payload;
        const eventIndex = state.events.findIndex(
          (event) => event._id === eventId
        );
        if (eventIndex !== -1) {
          const prev = state.events[eventIndex].media || {};
          state.events[eventIndex].media = { ...prev, galleryUrls: urls };
        }
        if (state.currentEvent && state.currentEvent._id === eventId) {
          const prev = state.currentEvent.media || {};
          state.currentEvent.media = { ...prev, galleryUrls: urls };
        }
      })

      // Get Event Details
      .addCase(getEventDetails.pending, (state) => {
        state.loading.currentEvent = true;
        state.error = null;
      })
      .addCase(getEventDetails.fulfilled, (state, action) => {
        state.loading.currentEvent = false;
        state.currentEvent = action.payload;
      })
      .addCase(getEventDetails.rejected, (state, action) => {
        state.loading.currentEvent = false;
        state.error = action.payload;
      })

      // Get Organizer Overview
      .addCase(getOrganizerOverview.pending, (state) => {
        state.loading.overview = true;
        state.error = null;
      })
      .addCase(getOrganizerOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.overview = action.payload;
      })
      .addCase(getOrganizerOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error = action.payload;
      })

      // Delete Event
      .addCase(deleteEvent.pending, (state) => {
        state.loading.actions = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.loading.actions = false;
        const { eventId } = action.payload;

        // Remove event from list
        state.events = state.events.filter((event) => event._id !== eventId);

        // Clear current event if it's the deleted one
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent = null;
        }
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loading.actions = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentEvent,
  clearCurrentEvent,
  setFilters,
  clearFilters,
  updateEventInList,
  removeEventFromList,
  addEventToList,
  setLoading,
} = organizerSlice.actions;

export default organizerSlice.reducer;
