import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, CreditCard, CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';
import { initiatePayment, setCheckoutStep } from '../store/slices/checkoutSlice';

const MpesaPayment = () => {
  const dispatch = useDispatch();
  const { currentOrder, paymentStatus, isLoading, error, mpesaPrompt } = useSelector((state) => state.checkout);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (paymentStatus === 'success') {
      // Auto-advance to confirmation after a short delay
      setTimeout(() => {
        dispatch(setCheckoutStep('confirmation'));
      }, 2000);
    }
  }, [paymentStatus, dispatch]);

  const validatePhone = (phone) => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    if (!/^254\d{9}$/.test(phone)) {
      return 'Please enter a valid Kenyan phone number (254XXXXXXXXX)';
    }
    return '';
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError('');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    const error = validatePhone(phoneNumber);
    if (error) {
      setPhoneError(error);
      return;
    }

    if (!currentOrder || !currentOrder._id) {
      console.error('No current order found');
      return;
    }

    // Initiate MPESA payment
    await dispatch(initiatePayment({ orderId: currentOrder._id, phoneNumber }));
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader className="w-16 h-16 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <CreditCard className="w-16 h-16 text-blue-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Processing your payment...';
      case 'success':
        return 'Payment successful! Redirecting to confirmation...';
      case 'failed':
        return 'Payment failed. Please try again.';
      default:
        return 'Enter your phone number to pay with MPESA';
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            MPESA Payment
          </h1>
          <p className="text-blue-200 text-lg">
            Complete your purchase securely with MPESA
          </p>
        </div>

        {/* Payment Form */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {/* Status Display */}
          <div className="text-center mb-8">
            <div className="mb-4">
              {getStatusIcon()}
            </div>
            <h2 className={`text-2xl font-semibold mb-2 ${getStatusColor()}`}>
              {getStatusMessage()}
            </h2>
            {paymentStatus === 'processing' && (
              <p className="text-blue-300 text-sm">
                Please check your phone for the MPESA prompt
              </p>
            )}
          </div>

          {/* MPESA Prompt Display */}
          {mpesaPrompt && (
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-400" />
                MPESA Prompt
              </h3>
              <div className="space-y-2 text-blue-200">
                <p><strong>Amount:</strong> KES {currentOrder?.pricing?.total?.toLocaleString() || 'N/A'}</p>
                <p><strong>Reference:</strong> {currentOrder?.orderNumber || 'N/A'}</p>
                <p><strong>Phone:</strong> {phoneNumber}</p>
              </div>
              <p className="text-blue-300 text-sm mt-3">
                Enter your MPESA PIN when prompted on your phone
              </p>
            </div>
          )}

          {/* Payment Form */}
          {paymentStatus !== 'success' && (
            <form onSubmit={handlePayment} className="space-y-6">
              <div>
                <label className="block text-blue-200 text-sm font-medium mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={paymentStatus === 'processing'}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      phoneError ? 'border-red-500' : 'border-blue-500/30'
                    }`}
                    placeholder="254XXXXXXXXX (Kenyan format)"
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-red-400 text-sm">{phoneError}</p>
                )}
                <p className="mt-2 text-blue-300 text-sm">
                  Format: 254XXXXXXXXX (e.g., 254712345678)
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Payment Button */}
              <button
                type="submit"
                disabled={!phoneNumber.trim() || paymentStatus === 'processing' || isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading || paymentStatus === 'processing' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {paymentStatus === 'processing' ? 'Processing...' : 'Initiating Payment...'}
                  </>
                ) : (
                  <>
                    Pay with MPESA
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success Message */}
          {paymentStatus === 'success' && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-400 mb-2">
                  Payment Successful!
                </h3>
                <p className="text-green-300">
                  Your order has been confirmed. You'll receive an email with your tickets shortly.
                </p>
              </div>
            </div>
          )}

          {/* Failed Payment */}
          {paymentStatus === 'failed' && (
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-400 mb-2">
                  Payment Failed
                </h3>
                <p className="text-red-300">
                  There was an issue processing your payment. Please try again.
                </p>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* MPESA Information */}
        <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            About MPESA Payment
          </h3>
          <div className="space-y-2 text-blue-200 text-sm">
            <p>• You'll receive an MPESA prompt on your phone</p>
            <p>• Enter your MPESA PIN to complete the payment</p>
            <p>• Payment is processed securely and instantly</p>
            <p>• You'll receive confirmation via email</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpesaPayment;
