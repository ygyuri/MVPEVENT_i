import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, CreditCard, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { initiatePayment, setCheckoutStep } from '../store/slices/checkoutSlice';

const MpesaPayment = () => {
  const dispatch = useDispatch();
  const { currentOrder, paymentStatus, mpesaPrompt, isLoading, error } = useSelector((state) => state.checkout);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (phone) => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!/^(254\d{9}|0\d{9})$/.test(phone)) {
      setPhoneError('Please enter phone as 07XXXXXXXX or 254XXXXXXXXX');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    if (phoneError) {
      validatePhone(value);
    }
  };

  const handleBack = () => {
    dispatch(setCheckoutStep('customer-info'));
  };

  const handlePayment = async () => {
    if (!validatePhone(phoneNumber)) {
      return;
    }

    if (!currentOrder?._id) {
      console.error('No order ID available');
      return;
    }

    try {
      await dispatch(initiatePayment({
        orderId: currentOrder._id,
        phoneNumber: phoneNumber
      })).unwrap();
    } catch (error) {
      console.error('Payment initiation failed:', error);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-400" />;
      default:
        return <CreditCard className="w-8 h-8 text-blue-400" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'pending':
        return 'Payment Pending';
      case 'success':
        return 'Payment Successful';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Ready for Payment';
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'pending':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-web3-primary flex items-center justify-center p-4 theme-transition">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-web3-primary mb-2">Order Not Found</h2>
          <p className="text-web3-blue mb-4">Please complete the previous steps first.</p>
          <button
            onClick={handleBack}
            className="btn-web3-secondary px-6 py-2 rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-web3-primary p-4 theme-transition">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 blob-primary"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-secondary"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-web3-primary mb-4">
            MPESA Payment
          </h1>
          <p className="text-web3-blue text-lg">
            Complete your payment using MPESA mobile money
          </p>
        </div>

        {/* Payment Form */}
        <div className="glass rounded-2xl p-8">
          {/* Order Summary */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
            <h3 className="text-lg font-semibold text-web3-primary mb-4">Order Summary</h3>
            <div className="space-y-2 text-web3-blue">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">{currentOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold text-web3-primary">
                  KES {currentOrder.pricing?.total?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="text-center mb-8">
            <div className="inline-flex flex-col items-center gap-3 p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
              {getStatusIcon()}
              <div>
                <h4 className={`text-xl font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </h4>
                {paymentStatus === 'pending' && (
                  <p className="text-web3-blue text-sm mt-1">
                    Check your phone for the MPESA prompt
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          {!paymentStatus || paymentStatus === 'failed' ? (
            <div className="mb-6">
              <label className="block text-web3-blue text-sm font-medium mb-2">
                MPESA Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-web3-blue" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`input-web3 w-full pl-10 pr-4 py-3 rounded-xl placeholder-web3-cyan focus:outline-none transition-all duration-300 ${
                    phoneError ? 'error' : ''
                  }`}
                  placeholder="07XXXXXXXX or 254XXXXXXXXX"
                />
              </div>
              {phoneError && (
                <p className="mt-1 text-red-400 text-sm">{phoneError}</p>
              )}
              <p className="mt-2 text-web3-cyan text-sm">Accepted: 07XXXXXXXX or 254XXXXXXXXX</p>
            </div>
          ) : null}

          {/* MPESA Prompt Display */}
          {mpesaPrompt && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <h4 className="text-green-400 font-semibold mb-2">MPESA Prompt Sent!</h4>
              <p className="text-web3-blue text-sm">
                Please check your phone and enter your MPESA PIN when prompted.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 status-error rounded-xl p-4">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleBack}
              className="btn-web3-secondary flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            
            {(!paymentStatus || paymentStatus === 'failed') && (
              <button
                onClick={handlePayment}
                disabled={isLoading || !phoneNumber.trim()}
                className="btn-web3-primary flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Initiating Payment...
                  </>
                ) : (
                  <>
                    Pay with MPESA
                    <CreditCard className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="mt-8 glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-web3-primary mb-4">How it works:</h3>
          <div className="space-y-3 text-web3-blue text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <p>Enter your MPESA-registered phone number</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <p>Click "Pay with MPESA" to receive the prompt</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <p>Enter your MPESA PIN when prompted on your phone</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                4
              </div>
              <p>Wait for confirmation and receive your tickets via email</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpesaPayment;
