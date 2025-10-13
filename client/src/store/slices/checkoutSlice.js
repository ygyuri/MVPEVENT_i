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
  async ({ orderId, phoneNumber }, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const { selectedProvider, providerCredentials } = state.checkout || {};
      const body = {
        phoneNumber,
        provider: selectedProvider || 'payhero',
      };
      if ((selectedProvider || 'mpesa') === 'pesapal') {
        body.credentials = {
          consumerKey: providerCredentials?.pesapal?.consumerKey,
          consumerSecret: providerCredentials?.pesapal?.consumerSecret,
        };
      }
      const response = await api.post(`/api/orders/${orderId}/pay`, body);
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

// Load initial state from localStorage
const loadInitialState = () => {
  try {
    const savedState = localStorage.getItem('checkoutState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        // Cart state
        cart: parsed.cart || [],
        cartTotal: parsed.cartTotal || 0,
        
        // Checkout state
        currentOrder: parsed.currentOrder || null,
        pricing: parsed.pricing || null,
        paymentStatus: parsed.paymentStatus || 'idle',
        
        // Customer info
        customerInfo: parsed.customerInfo || {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
        },
        
        // UI state
        checkoutStep: parsed.checkoutStep || 'cart',
        isLoading: false,
        error: null,
        
        // Payment processing
        paymentResult: parsed.paymentResult || null,
        mpesaPrompt: parsed.mpesaPrompt || null,
        
        // Payment provider selection
        selectedProvider: parsed.selectedProvider || 'payhero',
        providerCredentials: parsed.providerCredentials || {
          pesapal: {
            consumerKey: '',
            consumerSecret: '',
          },
        },
      };
    }
  } catch (error) {
    console.error('Error loading checkout state from localStorage:', error);
  }
  
  // Default state if no saved state or error
  return {
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
    // Payment provider selection
    selectedProvider: 'payhero',
    providerCredentials: {
      pesapal: {
        consumerKey: '',
        consumerSecret: '',
      },
    },
  };
};

const initialState = loadInitialState();

// Helper function to save state to localStorage
const saveToLocalStorage = (state) => {
  try {
    const stateToSave = {
      cart: state.cart,
      cartTotal: state.cartTotal,
      currentOrder: state.currentOrder,
      pricing: state.pricing,
      paymentStatus: state.paymentStatus,
      customerInfo: state.customerInfo,
      checkoutStep: state.checkoutStep,
      paymentResult: state.paymentResult,
      mpesaPrompt: state.mpesaPrompt,
      selectedProvider: state.selectedProvider,
      providerCredentials: state.providerCredentials,
    };
    localStorage.setItem('checkoutState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Error saving checkout state to localStorage:', error);
  }
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    // Cart actions (deprecated - kept for backward compatibility)
    addToCart: (state, action) => {
      const { eventId, eventTitle, ticketType, price, quantity = 1 } = action.payload;
      
      const existingItem = state.cart.find(
        item => item.eventId === eventId && item.ticketType === ticketType
      );
      
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
      } else {
        const newItem = {
          eventId,
          eventTitle,
          ticketType,
          unitPrice: price,
          quantity,
          subtotal: price * quantity,
        };
        state.cart.push(newItem);
      }
      
      // Recalculate cart total
      state.cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);
      
      // Save to localStorage
      saveToLocalStorage(state);
    },
    
    removeFromCart: (state, action) => {
      const { eventId, ticketType } = action.payload;
      state.cart = state.cart.filter(
        item => !(item.eventId === eventId && item.ticketType === ticketType)
      );
      state.cartTotal = state.cart.reduce((total, item) => total + item.subtotal, 0);
      saveToLocalStorage(state);
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
        saveToLocalStorage(state);
      }
    },
    
    clearCart: (state) => {
      state.cart = [];
      state.cartTotal = 0;
      saveToLocalStorage(state);
    },
    
    // Checkout flow actions
    setCheckoutStep: (state, action) => {
      state.checkoutStep = action.payload;
      saveToLocalStorage(state);
    },
    
    updateCustomerInfo: (state, action) => {
      state.customerInfo = { ...state.customerInfo, ...action.payload };
      saveToLocalStorage(state);
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
    setPaymentProvider: (state, action) => {
      state.selectedProvider = action.payload || 'mpesa';
    },
    setProviderCredentials: (state, action) => {
      const { provider, credentials } = action.payload || {};
      if (provider === 'pesapal') {
        state.providerCredentials.pesapal = {
          ...state.providerCredentials.pesapal,
          ...credentials,
        };
      }
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
      saveToLocalStorage(state);
    },
    
    // Clear all checkout data including localStorage
    clearAllCheckoutData: (state) => {
      state.cart = [];
      state.cartTotal = 0;
      state.currentOrder = null;
      state.pricing = null;
      state.paymentStatus = 'idle';
      state.customerInfo = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      };
      state.checkoutStep = 'cart';
      state.paymentResult = null;
      state.mpesaPrompt = null;
      state.error = null;
      state.selectedProvider = 'payhero';
      state.providerCredentials = {
        pesapal: {
          consumerKey: '',
          consumerSecret: '',
        },
      };
      // Clear localStorage
      localStorage.removeItem('checkoutState');
    },
    
    // Validate and fix cart items
    validateCartItems: (state) => {
      const originalCartLength = state.cart.length;
      
      state.cart = state.cart.filter(item => {
        // Remove items without eventId or with invalid data
        if (!item.eventId || !item.eventTitle || !item.ticketType || !item.unitPrice) {
          return false;
        }
        
        // Ensure subtotal is calculated
        if (!item.subtotal) {
          item.subtotal = item.unitPrice * item.quantity;
        }
        
        return true;
      });
      
      // Recalculate totals
      state.cartTotal = state.cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      
      // Only save if cart changed
      if (state.cart.length !== originalCartLength) {
        saveToLocalStorage(state);
      }
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
        const payload = action.payload?.data || {};
        state.mpesaPrompt = payload;
        // Update currentOrder payment info for UI routing
        state.currentOrder = state.currentOrder || {};
        state.currentOrder.payment = state.currentOrder.payment || {};
        if (payload.provider === 'pesapal') {
          state.currentOrder.payment.method = 'pesapal';
          state.currentOrder.payment.pesapalTrackingId = payload.trackingId || null;
          state.currentOrder.payment.pesapalRedirectUrl = payload.redirectUrl || null;
        } else {
          state.currentOrder.payment.method = 'mpesa';
          state.currentOrder.payment.mpesaCheckoutRequestId = payload.checkoutRequestId || null;
          state.currentOrder.payment.mpesaMerchantRequestId = payload.merchantRequestId || null;
        }
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
  setPaymentProvider,
  setProviderCredentials,
  clearError,
  resetCheckout,
  clearAllCheckoutData,
  validateCartItems,
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
