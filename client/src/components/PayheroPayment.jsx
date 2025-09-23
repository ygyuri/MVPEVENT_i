import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CreditCard, Phone, User, Mail, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../utils/api';

const PayheroPayment = ({ 
  orderData, 
  onPaymentSuccess, 
  onPaymentError, 
  onCancel 
}) => {
  const { isDarkMode } = useTheme();
  const { cart, customerInfo } = useSelector((state) => state.checkout);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    customerName: '',
    email: ''
  });
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error

  // Calculate fees when component mounts or cart changes
  useEffect(() => {
    if (cart && cart.length > 0) {
      const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
      calculateFees(totalAmount);
    }
  }, [cart]);

  // Auto-trigger STK push when component loads with customer info
  useEffect(() => {
    if (customerInfo && customerInfo.phone && !isProcessing && paymentStatus === 'idle') {
      // Pre-fill form with customer info
      setFormData({
        phoneNumber: customerInfo.phone.replace('+254', '0'), // Convert to 0XXXXXXXX format
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
        email: customerInfo.email || ''
      });
      
      // Auto-trigger STK push after a short delay
      setTimeout(() => {
        handleSubmit(new Event('submit')); // Trigger form submission
      }, 1000);
    }
  }, [customerInfo, isProcessing, paymentStatus]);

  const calculateFees = async (amount) => {
    try {
      const response = await api.post('/api/payhero/calculate-fees', { amount });
      setFeeBreakdown(response.data.data);
    } catch (error) {
      console.error('Error calculating fees:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^(\+254|254|0)?[17]\d{8}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid Kenyan phone number';
    }
    
    // Customer name validation
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (formData.customerName.trim().length < 2) {
      newErrors.customerName = 'Name must be at least 2 characters';
    }
    
    // Email validation (optional but if provided, must be valid)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format phone number
    if (value.startsWith('254')) {
      value = value;
    } else if (value.startsWith('0')) {
      value = '254' + value.substring(1);
    } else if (value.startsWith('7') && value.length === 9) {
      value = '254' + value;
    }
    
    setFormData(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    setPaymentStatus('processing');
    
    try {
      // Calculate total amount from cart
      const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
      
      // Create order first
      const orderData = {
        customer: {
          firstName: customerInfo?.firstName || formData.customerName.split(' ')[0] || 'Guest',
          lastName: customerInfo?.lastName || formData.customerName.split(' ').slice(1).join(' ') || 'Customer',
          email: customerInfo?.email || formData.email,
          phone: customerInfo?.phone || formData.phoneNumber
        },
        items: cart.map(item => ({
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          ticketType: item.ticketType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        totalAmount: totalAmount
      };
      
      // Create order
      const orderResponse = await api.post('/api/orders/create', orderData);
      
      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.error || 'Failed to create order');
      }
      
      const createdOrder = orderResponse.data.data;
      
      // Now initiate payment
      const paymentData = {
        amount: totalAmount,
        phoneNumber: formData.phoneNumber,
        customerName: formData.customerName,
        email: formData.email,
        orderId: createdOrder._id,
        items: cart
      };
      
      const response = await api.post('/api/payhero/initiate-payment', paymentData);
      
      if (response.data.success) {
        setPaymentStatus('success');
        onPaymentSuccess(response.data.data);
        
        // Start polling for payment status
        pollPaymentStatus(response.data.data.orderId);
      } else {
        throw new Error(response.data.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      onPaymentError(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (orderId) => {
    const maxAttempts = 30; // Poll for 5 minutes (10 seconds * 30)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await api.get(`/api/payhero/payment-status/${orderId}`);
        
        if (response.data.success) {
          const status = response.data.data.paymentStatus;
          
          if (status === 'completed') {
            setPaymentStatus('success');
            onPaymentSuccess(response.data.data);
            return;
          } else if (status === 'failed' || status === 'cancelled') {
            setPaymentStatus('error');
            onPaymentError('Payment was cancelled or failed');
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setPaymentStatus('error');
          onPaymentError('Payment timeout - please check your phone for MPESA prompt');
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setPaymentStatus('error');
          onPaymentError('Unable to verify payment status');
        }
      }
    };
    
    // Start polling after 5 seconds
    setTimeout(poll, 5000);
  };

  if (paymentStatus === 'success') {
    return (
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-8 border border-gray-200 dark:border-gray-700`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Payment Successful!
          </h3>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Your payment has been processed successfully. You will receive a confirmation email shortly.
          </p>
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Check your phone for MPESA confirmation message
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center mb-6">
        <CreditCard className={`w-6 h-6 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Complete Payment
        </h3>
      </div>

      {/* Price Breakdown */}
      {feeBreakdown && (
        <div className={`p-4 rounded-2xl mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Price Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Subtotal:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                KES {feeBreakdown.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Processing Fee:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                KES {feeBreakdown.processingFee.toFixed(2)}
              </span>
            </div>
            {feeBreakdown.fixedFee > 0 && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Fixed Fee:</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  KES {feeBreakdown.fixedFee.toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-semibold">
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Total:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                KES {feeBreakdown.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Name */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                errors.customerName 
                  ? isDarkMode 
                    ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                  : isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`}
              placeholder="Enter your full name"
            />
          </div>
          {errors.customerName && (
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {errors.customerName}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                errors.phoneNumber 
                  ? isDarkMode 
                    ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                  : isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`}
              placeholder="254XXXXXXXXX or 07XXXXXXXX"
            />
          </div>
          {errors.phoneNumber && (
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {errors.phoneNumber}
            </p>
          )}
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            You will receive an MPESA prompt on this number
          </p>
        </div>

        {/* Email (Optional) */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Email Address (Optional)
          </label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${
                errors.email 
                  ? isDarkMode 
                    ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400' 
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-500'
                  : isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200`}
              placeholder="your@email.com"
            />
          </div>
          {errors.email && (
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {errors.email}
            </p>
          )}
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            For receipt and order updates
          </p>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'processing' && (
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
            <div className="flex items-center">
              <Loader className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  Processing Payment...
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  Check your phone for MPESA prompt
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border`}>
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                  Payment Failed
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  Please try again or contact support
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-3 px-4 rounded-2xl font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing || paymentStatus === 'processing'}
            className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center ${
              isProcessing || paymentStatus === 'processing'
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
            }`}
          >
            {isProcessing || paymentStatus === 'processing' ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay KES {feeBreakdown?.totalAmount?.toFixed(2) || '0.00'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayheroPayment;
