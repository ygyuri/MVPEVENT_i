
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer from './slices/eventsSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import checkoutReducer from './slices/checkoutSlice';
import currencyReducer from './slices/currencySlice';
import ticketsReducer from './slices/ticketsSlice';
import scannerReducer from './slices/scannerSlice';
import organizerReducer from './slices/organizerSlice';
import eventFormReducer from './slices/eventFormSlice';

export const store = configureStore({
  reducer: {
    events: eventsReducer,
    auth: authReducer,
    ui: uiReducer,
    checkout: checkoutReducer,
    currency: currencyReducer,
    tickets: ticketsReducer,
    scanner: scannerReducer,
    organizer: organizerReducer,
    eventForm: eventFormReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Type definitions for TypeScript users (optional)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
