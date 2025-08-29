import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks for API calls
export const createOrder = createAsyncThunk(
  'checkout/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/orders/create', orderData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to create order' });
    }
  }
);

export const initiatePayment = createAsyncThunk(
  'checkout/initiatePayment',
  async ({ orderId, phoneNumber }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/orders/${orderId}/pay`, { phoneNumber });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to initiate payment' });
    }
  }
);

export const calculatePricing = createAsyncThunk(
  'checkout/calculatePricing',
  async (items, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/orders/calculate-pricing', { items });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to calculate pricing' });
    }
  }
);

export const getOrderDetails = createAsyncThunk(
  'checkout/getOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to get order details' });
    }
  }
);

const initialState = {
  // Cart state
  cart: [],
  cartTotal: 0,
  
  // Checkout state
  currentOrder: null,
  pricing: null,
  paymentStatus: 'idle', // idle, processing, success, failed
  
  // Customer info
  customerInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  },
  
  // UI state
  checkoutStep: 'cart', // cart, customer-info, payment, confirmation
  isLoading: false,
  error: null,
  
  // Payment processing
  paymentResult: null,
  mpesaPrompt: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    // Cart actions
    addToCart: (state, action) => {
      const { eventId, eventTitle, ticketType, price, quantity = 1 } = action.payload;
      
      const existingItem = state.cart.find(
        item => item.eventId === eventId && item.ticketType === ticketType
      );
      
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
      } else {
        state.cart.push({
          eventId,
          eventTitle,
          ticketType,
          unitPrice: price,
          quantity,
          subtotal: price * quantity,
        });
      }
      
      state.cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);
    },
    
    removeFromCart: (state, action) => {
      const { eventId, ticketType } = action.payload;
      state.cart = state.cart.filter(
        item => !(item.eventId === eventId && item.ticketType === ticketType)
      );
      state.cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);
    },
    
    updateCartItemQuantity: (state, action) => {
      const { eventId, ticketType, quantity } = action.payload;
      const item = state.cart.find(
        item => item.eventId === eventId && item.ticketType === ticketType
      );
      
      if (item) {
        item.quantity = Math.max(1, quantity);
        item.subtotal = item.quantity * item.unitPrice;
        state.cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);
      }
    },
    
    clearCart: (state) => {
      state.cart = [];
      state.cartTotal = 0;
    },
    
    // Checkout flow actions
    setCheckoutStep: (state, action) => {
      state.checkoutStep = action.payload;
    },
    
    updateCustomerInfo: (state, action) => {
      state.customerInfo = { ...state.customerInfo, ...action.payload };
    },
    
    setPricing: (state, action) => {
      state.pricing = action.payload;
    },
    
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
    
    setMpesaPrompt: (state, action) => {
      state.mpesaPrompt = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetCheckout: (state) => {
      state.currentOrder = null;
      state.pricing = null;
      state.paymentStatus = 'idle';
      state.checkoutStep = 'cart';
      state.paymentResult = null;
      state.mpesaPrompt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create order
    builder
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload.data;
        state.checkoutStep = 'payment';
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to create order';
      });
    
    // Initiate payment
    builder
      .addCase(initiatePayment.pending, (state) => {
        state.paymentStatus = 'processing';
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.paymentStatus = 'processing';
        state.mpesaPrompt = action.payload.data;
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.paymentStatus = 'failed';
        state.error = action.payload?.error || 'Payment initiation failed';
      });
    
    // Calculate pricing
    builder
      .addCase(calculatePricing.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(calculatePricing.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pricing = action.payload.data;
      })
      .addCase(calculatePricing.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to calculate pricing';
      });
    
    // Get order details
    builder
      .addCase(getOrderDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getOrderDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload.data;
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to get order details';
      });
  },
});

// Export actions
export const {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  setCheckoutStep,
  updateCustomerInfo,
  setPricing,
  setPaymentStatus,
  setMpesaPrompt,
  clearError,
  resetCheckout,
} = checkoutSlice.actions;

// Export selectors
export const selectCart = (state) => state.checkout.cart;
export const selectCartTotal = (state) => state.checkout.cartTotal;
export const selectCartItemCount = (state) => 
  state.checkout.cart.reduce((total, item) => total + item.quantity, 0);
export const selectCurrentOrder = (state) => state.checkout.currentOrder;
export const selectPricing = (state) => state.checkout.pricing;
export const selectPaymentStatus = (state) => state.checkout.paymentStatus;
export const selectCustomerInfo = (state) => state.checkout.customerInfo;
export const selectCheckoutStep = (state) => state.checkout.checkoutStep;
export const selectIsLoading = (state) => state.checkout.isLoading;
export const selectError = (state) => state.checkout.error;
export const selectMpesaPrompt = (state) => state.checkout.mpesaPrompt;

export default checkoutSlice.reducer;
