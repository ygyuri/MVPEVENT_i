import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User, Mail, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';
import { updateCustomerInfo, createOrder, setCheckoutStep, setPaymentProvider } from '../store/slices/checkoutSlice';
import PhoneNumberInput from './PhoneNumberInput';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

const CustomerInfoForm = () => {
  const dispatch = useDispatch();
  const { customerInfo, cart, isLoading, error } = useSelector((state) => state.checkout);
  const { isDarkMode } = useTheme();
  
  // Payment polling function
  const pollPaymentStatus = async (paymentReference, orderNumber) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = 5 minutes (10 seconds each)
    
    const poll = async () => {
      try {
        attempts++;
        console.log(`🔍 Polling payment status (attempt ${attempts}/${maxAttempts})...`);
        
        const response = await api.post('/api/payhero/verify-payment', {
          paymentReference
        });
        
        if (response.data.success) {
          console.log('✅ Payment verified successfully!');
          alert(`🎉 Payment successful!\n\nOrder: ${orderNumber}\n\nYour tickets have been confirmed.`);
          dispatch(setCheckoutStep('confirmation'));
          return;
        } else {
          console.log('⏳ Payment still pending...');
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            console.log('⏰ Payment verification timeout');
            alert(`⏰ Payment verification timeout.\n\nPlease check your M-Pesa transaction history.\n\nIf payment was successful, contact support with order: ${orderNumber}`);
          }
        }
      } catch (error) {
        console.error('❌ Payment verification error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Continue polling on error
        } else {
          alert(`❌ Payment verification failed.\n\nPlease check your M-Pesa transaction history.\n\nContact support if needed with order: ${orderNumber}`);
        }
      }
    };
    
    // Start polling after 5 seconds
    setTimeout(poll, 5000);
  };
  
  const [formData, setFormData] = useState({
    name: customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim(),
    email: customerInfo?.email || '',
    phone: customerInfo?.phone ? customerInfo.phone.replace(/^\+\d{3}/, '') : '' // Remove country code for display
  });
  
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter exactly 9 digits for Kenya';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBack = () => {
    dispatch(setCheckoutStep('cart'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Update customer info in store with full international phone number
    const customerDataWithFullPhone = {
      ...formData,
      phone: fullPhoneNumber || `+254${formData.phone}` // Use full number or fallback to Kenya
    };
    dispatch(updateCustomerInfo(customerDataWithFullPhone));
    
    // Debug: Log cart state before creating order
    console.log('CustomerInfoForm - Cart state before order creation:', {
      cart,
      cartLength: cart.length,
      cartItems: cart.map(item => ({
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        ticketType: item.ticketType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      }))
    });
    
    // Create order with cart data and customer info
    const orderData = {
      customer: customerDataWithFullPhone,
      items: cart
    };
    
    console.log('CustomerInfoForm - Order data being sent:', orderData);
    
    const result = await dispatch(createOrder(orderData));
    
    if (createOrder.fulfilled.match(result)) {
      // Order created successfully, now directly trigger PayHero STK push
      const order = result.payload.data;
      console.log('Order created successfully:', order);
      
      try {
        // Calculate total amount
        const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Prepare PayHero STK push data
        const stkPushData = {
          amount: Math.round(totalAmount),
          phoneNumber: customerDataWithFullPhone.phone.replace('+254', '0'), // Convert to 0XXXXXXXX format
          customerName: customerDataWithFullPhone.name,
          orderId: order.orderId, // Use orderId instead of _id
          channelId: 3424, // Your correct channel ID
          provider: 'm-pesa',
          externalReference: order.orderNumber,
          // Add customer info to ensure phone is available
          customer: customerDataWithFullPhone
        };
        
        console.log('🚀 Initiating PayHero STK push with data:', stkPushData);
        
        // Call PayHero STK push API directly
        const stkResponse = await api.post('/api/payhero/initiate-payment', stkPushData);
        
        if (stkResponse.data.success) {
          console.log('✅ STK push initiated successfully:', stkResponse.data);
          
          // Show user-friendly message
          alert(`📱 STK push sent to ${stkPushData.phoneNumber}!\n\nPlease check your phone and complete the M-Pesa payment.\n\n⏳ You will be redirected once payment is confirmed.`);
          
          // Start polling for payment verification
          pollPaymentStatus(stkResponse.data.data.paymentReference, order.orderNumber);
          
        } else {
          throw new Error(stkResponse.data.error || 'STK push initiation failed');
        }
        
      } catch (error) {
        console.error('❌ STK push failed:', error.response?.data || error.message);
        alert(`❌ Payment initiation failed: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            Customer Information
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please provide your details to complete your order
          </p>
        </div>

        {/* Form Card */}
        <div className={`rounded-3xl p-6 sm:p-8 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.name
                      ? isDarkMode
                        ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400'
                        : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                      : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.email
                      ? isDarkMode
                        ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400'
                        : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                      : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <PhoneNumberInput
                value={formData.phone}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                onFullNumberChange={setFullPhoneNumber}
                error={errors.phone}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={handleBack}
                className={`flex-1 sm:flex-none px-6 py-3 font-semibold flex items-center justify-center gap-2 rounded-2xl transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Cart
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-8 py-3 font-semibold flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <div className={`inline-flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <CreditCard className="w-4 h-4" />
            Your information is secure and encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoForm;
