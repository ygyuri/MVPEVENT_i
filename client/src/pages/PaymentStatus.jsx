import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Clock, Receipt, Mail, Download } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

const PaymentStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useTheme();

  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  // Optimized polling with exponential backoff
  const POLLING_CONFIG = {
    initialInterval: 3000,    // 3 seconds
    maxInterval: 15000,       // 15 seconds max
    backoffMultiplier: 1.2,   // 20% increase each time
    maxAttempts: 20,          // Reduced from 24
    maxTotalTime: 180000      // 3 minutes total (reduced from 2 minutes)
  };

  // Poll order status with optimized strategy
  useEffect(() => {
    let pollTimeout;
    let attemptCount = 0;
    let currentInterval = POLLING_CONFIG.initialInterval;

    const checkOrderStatus = async () => {
      try {
        // Only log every 3rd attempt to reduce noise
        if (attemptCount % 3 === 0) {
          console.log(`📊 Polling attempt ${attemptCount + 1} (${currentInterval}ms interval)`);
        }

        const response = await api.get(`/api/orders/${orderId}/status`);
        const data = response.data;

        setOrderStatus(data);
        setLoading(false);
        setPollingCount(attemptCount + 1);

        // Stop polling if payment is completed or failed
        if (data.paymentStatus === 'completed' || data.paymentStatus === 'paid' || data.paymentStatus === 'failed') {
          console.log('✅ Payment status resolved, stopping polling');
          return; // Exit function, no more polling
        }

        // Continue polling with exponential backoff
        attemptCount++;
        
        if (attemptCount < POLLING_CONFIG.maxAttempts) {
          // Increase interval gradually, but cap at maxInterval
          currentInterval = Math.min(
            currentInterval * POLLING_CONFIG.backoffMultiplier,
            POLLING_CONFIG.maxInterval
          );
          
          pollTimeout = setTimeout(checkOrderStatus, currentInterval);
        } else {
          console.log('⏰ Max polling attempts reached');
          setError('Payment confirmation is taking longer than expected. Please check your email or wallet.');
        }

      } catch (err) {
        console.error('Error checking order status:', err);
        setError(err.response?.data?.error || 'Failed to check order status');
        setLoading(false);
      }
    };

    // Initial check
    checkOrderStatus();

    // Global timeout as safety net
    const globalTimeout = setTimeout(() => {
      console.log('⏰ Global timeout reached, stopping polling');
      setError('Payment confirmation is taking longer than expected. Please check your email or wallet.');
    }, POLLING_CONFIG.maxTotalTime);

    // Cleanup
    return () => {
      if (pollTimeout) clearTimeout(pollTimeout);
      if (globalTimeout) clearTimeout(globalTimeout);
    };
  }, [orderId]);

  // Status display components
  const StatusPending = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-6">
        <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400 animate-pulse" />
      </div>
      <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Waiting for Payment
      </h1>
      <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Please check your phone and enter your M-PESA PIN
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking payment status... ({pollingCount})</span>
      </div>
    </motion.div>
  );

  const StatusProcessing = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
        <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Processing Payment
      </h1>
      <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Your payment is being confirmed...
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Verifying payment... ({pollingCount})</span>
      </div>
    </motion.div>
  );

  const StatusSuccess = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Payment Successful! 🎉
      </h1>
      <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Your tickets have been purchased successfully
      </p>

      {orderStatus && (
        <div className={`p-6 rounded-xl mb-6 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Order Number</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {orderStatus.orderNumber}
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tickets</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {orderStatus.ticketCount || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Amount Paid</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {orderStatus.currency} {(orderStatus.totalAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className={`p-4 rounded-lg mb-6 ${
        isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1 text-left">
            <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              A confirmation email with your ticket(s) and QR code(s) has been sent to:
            </p>
            <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {orderStatus?.customer?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate('/wallet')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Receipt className="w-5 h-5" />
          View My Tickets
        </button>
        <button
          onClick={() => navigate('/events')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' 
              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
          }`}
        >
          Browse More Events
        </button>
      </div>
    </motion.div>
  );

  const StatusFailed = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
        <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
      </div>
      <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Payment Failed
      </h1>
      <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {error || 'Your payment could not be processed'}
      </p>

      {orderStatus && (
        <div className={`p-6 rounded-xl mb-6 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Order Number</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {orderStatus.orderNumber}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
            <span className="font-bold text-red-600">Failed</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate('/events')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' 
              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
          }`}
        >
          Browse Events
        </button>
      </div>
    </motion.div>
  );

  // Loading state
  if (loading && !orderStatus) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {(orderStatus?.paymentStatus === 'completed' || orderStatus?.paymentStatus === 'paid') && <StatusSuccess key="success" />}
          {orderStatus?.paymentStatus === 'failed' && <StatusFailed key="failed" />}
          {orderStatus?.paymentStatus === 'processing' && <StatusProcessing key="processing" />}
          {(orderStatus?.paymentStatus === 'pending' || !orderStatus) && <StatusPending key="pending" />}
        </AnimatePresence>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === 'development' && orderStatus && (
          <div className="mt-8 p-4 rounded-lg bg-gray-800 border border-gray-700 text-xs">
            <h3 className="text-white font-semibold mb-2">Debug Info:</h3>
            <pre className="text-gray-300 overflow-auto">
              {JSON.stringify(orderStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;

