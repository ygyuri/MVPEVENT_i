import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Request deduplication cache for auth API
const authRequestCache = new Map();

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/login", credentials);
      const { user, tokens } = response.data;

      // Store tokens in localStorage
      localStorage.setItem("authToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);

      return { user, tokens };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Login failed";
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/register", userData);
      const { user, tokens } = response.data;

      // Store tokens in localStorage
      localStorage.setItem("authToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);

      return { user, tokens };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Registration failed";
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.authToken;
      if (token) {
        await api.post("/api/auth/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.authToken;
      if (!token) throw new Error("No token available");

      const requestKey = "/api/auth/me";
      const now = Date.now();

      // Check if we have a recent request for the same URL
      if (authRequestCache.has(requestKey)) {
        const lastRequest = authRequestCache.get(requestKey);
        if (now - lastRequest < 5000) {
          // 5 seconds cache for auth
          console.log("🚫 [API AUTH] Deduplicating request:", requestKey);
          return new Promise((resolve) => {
            // Return cached promise or wait for ongoing request
            setTimeout(() => {
              resolve(authRequestCache.get(requestKey + "_result"));
            }, 100);
          });
        }
      }

      // Store request timestamp
      authRequestCache.set(requestKey, now);

      console.log("🔄 [API AUTH] Request:", {
        url: requestKey,
        timestamp: new Date().toISOString(),
      });

      const response = await api.get(requestKey);

      // Store result in cache
      authRequestCache.set(requestKey + "_result", response.data.user);

      console.log("✅ [API AUTH] Response:", {
        status: response.status,
        data: response.data.user,
        timestamp: new Date().toISOString(),
      });

      return response.data.user;
    } catch (error) {
      console.error("❌ [API AUTH] Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to get user";
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      console.log("🔄 [API PROFILE UPDATE] Request:", {
        data: profileData,
        timestamp: new Date().toISOString(),
      });

      const response = await api.put("/api/auth/profile", profileData);

      console.log("✅ [API PROFILE UPDATE] Response:", {
        status: response.status,
        data: response.data.user,
        timestamp: new Date().toISOString(),
      });

      return response.data.user;
    } catch (error) {
      console.error("❌ [API PROFILE UPDATE] Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update profile";
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  user: null,
  authToken: localStorage.getItem("authToken") || null,
  isAuthenticated: !!localStorage.getItem("authToken"),
  loading: false,
  error: null,
  // Impersonation state
  isImpersonating: !!localStorage.getItem("impersonatingUserId"),
  impersonatingUser: localStorage.getItem("impersonatingUserId")
    ? {
        _id: localStorage.getItem("impersonatingUserId"),
        email: localStorage.getItem("impersonatingUserEmail"),
      }
    : null,
  originalUser: localStorage.getItem("originalUserId")
    ? {
        _id: localStorage.getItem("originalUserId"),
      }
    : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthToken: (state, action) => {
      state.authToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    impersonateOrganizer: (state, action) => {
      const organizer = action.payload;
      state.isImpersonating = true;
      state.impersonatingUser = organizer;
      state.originalUser = { _id: state.user._id, email: state.user.email };
      // Temporarily update user to organizer for UI purposes
      // Backend will still validate admin token
      state.user = { ...organizer, isImpersonated: true };
      localStorage.setItem("impersonatingUserId", organizer._id);
      localStorage.setItem("impersonatingUserEmail", organizer.email);
      localStorage.setItem("originalUserId", state.originalUser._id);
    },
    stopImpersonation: (state) => {
      // Restore original user - will need to fetch from backend
      state.isImpersonating = false;
      state.impersonatingUser = null;
      state.originalUser = null;
      localStorage.removeItem("impersonatingUserId");
      localStorage.removeItem("impersonatingUserEmail");
      localStorage.removeItem("originalUserId");
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.authToken = action.payload.tokens.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.authToken = action.payload.tokens.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.authToken = null;
        state.isAuthenticated = false;
      })

      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // If getting user fails, logout
        state.user = null;
        state.authToken = null;
        state.isAuthenticated = false;
      })

      // Update User Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setAuthToken,
  impersonateOrganizer,
  stopImpersonation,
} = authSlice.actions;
export default authSlice.reducer;
