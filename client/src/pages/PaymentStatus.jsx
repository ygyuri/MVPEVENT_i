import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Mail,
  Download,
  Shield,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import api from "../utils/api";
import payheroLogo from "../assets/payhero-logo.png";
import tajilabsLogo from "../assets/tajilabs-logo-horizontal.png";

const PaymentStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useTheme();

  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  // Long polling with Redis Pub/Sub (87% fewer API calls!)
  useEffect(() => {
    let abortController = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3; // Only retry 3 times max
    const RETRY_DELAY = 5000; // 5 seconds between retries

    const waitForPaymentCompletion = async () => {
      try {
        const attemptNum = retryCount + 1;
        setPollingCount(attemptNum);

        // Single long-polling request (server holds connection for up to 60s)
        const response = await api.get(`/api/orders/${orderId}/wait`, {
          timeout: 65000, // 65s (slightly longer than server timeout)
          signal: abortController.signal,
          params: {
            timeout: 60000, // Tell server to wait 60s max
          },
        });

        const data = response.data;
        setOrderStatus(data);
        setLoading(false);

        // Check if payment completed (any final state)
        if (
          data.paymentStatus === "completed" ||
          data.paymentStatus === "paid" ||
          data.paymentStatus === "failed" ||
          data.paymentStatus === "cancelled"
        ) {
          return; // Done - no more requests needed!
        }

        // Still processing after long poll - retry if under max
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(waitForPaymentCompletion, RETRY_DELAY);
        } else {
          setError("timeout");
          setLoading(false);
        }
      } catch (err) {
        // Request was aborted (component unmounted)
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          return;
        }

        // Retry on network errors (with limit)
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(waitForPaymentCompletion, RETRY_DELAY);
        } else {
          setError(
            err.response?.data?.error ||
              "Failed to check payment status. Please refresh the page."
          );
          setLoading(false);
        }
      }
    };

    // Start the long polling process
    waitForPaymentCompletion();

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [orderId]);

  // Status display components
  const StatusPending = () => {
    // Payment journey steps
    const steps = [
      {
        icon: "📱",
        title: "Check Your Phone",
        subtitle: "M-PESA prompt sent",
        status: "complete",
      },
      {
        icon: "🔐",
        title: "Enter Your PIN",
        subtitle: "Complete the payment",
        status: "current",
      },
      {
        icon: "✅",
        title: "Confirmation",
        subtitle: "Receive your tickets",
        status: "pending",
      },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto"
      >
        {/* Main status */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-6 animate-pulse shadow-lg">
            <Clock className="w-12 h-12 text-white" />
          </div>
          <h1
            className={`text-3xl font-bold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Waiting for Payment
          </h1>
          <p
            className={`text-lg mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Check your phone for the M-PESA prompt
          </p>
          <p
            className={`text-md ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Enter your PIN to complete the payment
          </p>
        </div>

        {/* Powered by Tajilabs */}
        <div
          className={`flex flex-col items-center justify-center gap-2 mb-6 p-4 ${
            isDarkMode
              ? "bg-gray-800/50 border border-gray-700"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <p
            className={`text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Powered by
          </p>
          <a
            href="https://tajilabs.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src={tajilabsLogo}
              alt="Tajilabs"
              className="h-8 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </a>
        </div>

        {/* Progress Steps */}
        <div
          className={`p-6 mb-6 shadow-xl ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-4 text-left ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Payment Process
          </h3>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    step.status === "complete"
                      ? "bg-green-100 dark:bg-green-900/20"
                      : step.status === "current"
                      ? "bg-yellow-100 dark:bg-yellow-900/20 animate-pulse"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div className="flex-1 text-left">
                  <div
                    className={`font-semibold ${
                      step.status === "current"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : step.status === "complete"
                        ? "text-green-600 dark:text-green-400"
                        : isDarkMode
                        ? "text-gray-500"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {step.subtitle}
                  </div>
                </div>
                {step.status === "current" && (
                  <Loader2 className="w-5 h-5 animate-spin text-yellow-600 dark:text-yellow-400" />
                )}
                {step.status === "complete" && (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Helpful tip */}
        <div
          className={`p-4 ${
            isDarkMode
              ? "bg-blue-900/20 border border-blue-500/30"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p
            className={`text-sm ${
              isDarkMode ? "text-blue-300" : "text-blue-700"
            }`}
          >
            💡 <strong>Tip:</strong> The M-PESA prompt may take a few seconds to
            appear on your phone. Please wait and don't close this page.
          </p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-300/30 dark:border-blue-700/30">
            <span
              className={`text-xs ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              Payment processed securely via PayHero
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  const StatusProcessing = () => {
    // Payment confirmation steps
    const steps = [
      {
        icon: "📱",
        title: "M-PESA Prompt Sent",
        subtitle: "Delivered to your phone",
        status: "complete",
      },
      {
        icon: "🔐",
        title: "PIN Entered",
        subtitle: "Payment initiated",
        status: "complete",
      },
      {
        icon: "🔄",
        title: "Confirming Payment",
        subtitle: "Verifying with M-PESA",
        status: "current",
      },
      {
        icon: "✅",
        title: "Tickets Ready",
        subtitle: "Almost there...",
        status: "pending",
      },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto"
      >
        {/* Main status */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <h1
            className={`text-3xl font-bold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Confirming Payment
          </h1>
          <p
            className={`text-lg mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            We received your M-PESA transaction
          </p>
          <p
            className={`text-md ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Verifying with M-PESA... This usually takes 20-40 seconds
          </p>
        </div>

        {/* Powered by Tajilabs */}
        <div
          className={`flex flex-col items-center justify-center gap-2 mb-6 p-4 ${
            isDarkMode
              ? "bg-gray-800/50 border border-gray-700"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <p
            className={`text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Powered by
          </p>
          <a
            href="https://tajilabs.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src={tajilabsLogo}
              alt="Tajilabs"
              className="h-8 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </a>
        </div>

        {/* Progress Steps */}
        <div
          className={`p-6 mb-6 shadow-xl ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-4 text-left ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Verification Progress
          </h3>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    step.status === "complete"
                      ? "bg-green-100 dark:bg-green-900/20"
                      : step.status === "current"
                      ? "bg-blue-100 dark:bg-blue-900/20 animate-pulse"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div className="flex-1 text-left">
                  <div
                    className={`font-semibold ${
                      step.status === "current"
                        ? "text-blue-600 dark:text-blue-400"
                        : step.status === "complete"
                        ? "text-green-600 dark:text-green-400"
                        : isDarkMode
                        ? "text-gray-500"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {step.subtitle}
                  </div>
                </div>
                {step.status === "current" && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                )}
                {step.status === "complete" && (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reassurance */}
        <div
          className={`p-4 ${
            isDarkMode
              ? "bg-green-900/20 border border-green-500/30"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <p
            className={`text-sm ${
              isDarkMode ? "text-green-300" : "text-green-700"
            }`}
          >
            ✅ <strong>Payment initiated!</strong> We're just waiting for final
            confirmation from M-PESA.
          </p>
        </div>
      </motion.div>
    );
  };

  const StatusSuccess = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 mb-6 shadow-lg">
        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      <h1
        className={`text-3xl md:text-4xl font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Payment Successful! 🎉
      </h1>
      <p
        className={`text-lg mb-6 ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        Your tickets have been purchased successfully
      </p>

      {/* Powered by Tajilabs */}
      <div
        className={`flex flex-col items-center justify-center gap-2 mb-6 p-4 ${
          isDarkMode
            ? "bg-gray-800/30 border border-gray-700"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <p
          className={`text-xs ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Powered by
        </p>
        <a
          href="https://tajilabs.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={tajilabsLogo}
            alt="Tajilabs"
            className="h-8 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </a>
      </div>

      {orderStatus && (
        <div
          className={`p-6 mb-6 shadow-xl ${
            isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Order Number
            </span>
            <span
              className={`font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {orderStatus.orderNumber}
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Tickets
            </span>
            <span
              className={`font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {orderStatus.ticketCount || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Amount Paid
            </span>
            <span
              className={`font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {orderStatus.currency}{" "}
              {(orderStatus.totalAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div
        className={`p-4 mb-6 ${
          isDarkMode
            ? "bg-blue-900/20 border border-blue-500/30"
            : "bg-blue-50 border border-blue-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1 text-left">
            <p
              className={`text-sm ${
                isDarkMode ? "text-blue-300" : "text-blue-700"
              }`}
            >
              A confirmation email with your ticket(s) and QR code(s) has been
              sent to:
            </p>
            <p
              className={`text-sm font-semibold mt-1 ${
                isDarkMode ? "text-blue-200" : "text-blue-800"
              }`}
            >
              {orderStatus?.customer?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate("/events")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
            isDarkMode
              ? "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
              : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          }`}
        >
          Browse More Events
        </button>
      </div>
    </motion.div>
  );

  const StatusTimeout = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center max-w-3xl mx-auto"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-6 shadow-lg">
        <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
      </div>
      <h1
        className={`text-3xl font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Payment Confirmation Delayed
      </h1>
      <p
        className={`text-lg mb-6 ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        We couldn't confirm your payment status. This might mean:
      </p>

      {/* Powered by Tajilabs */}
      <div
        className={`flex flex-col items-center justify-center gap-2 mb-6 p-4 ${
          isDarkMode
            ? "bg-gray-800/50 border border-gray-700"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <p
          className={`text-xs ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Powered by
        </p>
        <a
          href="https://tajilabs.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={tajilabsLogo}
            alt="Tajilabs"
            className="h-8 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </a>
      </div>

      <div
        className={`p-6 mb-6 shadow-xl text-left ${
          isDarkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200"
        }`}
      >
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-blue-500 mt-1">•</span>
            <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              <strong>You didn't complete the payment</strong> - No PIN entered
              or cancelled
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-blue-500 mt-1">•</span>
            <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              <strong>Payment is still processing</strong> - M-PESA confirmation
              delayed
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-blue-500 mt-1">•</span>
            <span className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              <strong>Network issue</strong> - Connection problem between
              services
            </span>
          </li>
        </ul>
      </div>

      <div
        className={`p-4 mb-6 ${
          isDarkMode
            ? "bg-blue-900/20 border border-blue-500/30"
            : "bg-blue-50 border border-blue-200"
        }`}
      >
        <h3
          className={`font-semibold mb-3 ${
            isDarkMode ? "text-blue-300" : "text-blue-800"
          }`}
        >
          What to do next:
        </h3>
        <ol className="space-y-2 text-left">
          <li
            className={`flex items-start gap-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <span className="font-bold">1.</span>
            <span>Check your phone for M-PESA confirmation SMS</span>
          </li>
          <li
            className={`flex items-start gap-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <span className="font-bold">2.</span>
            <span>Check your email for ticket confirmation</span>
          </li>
          <li
            className={`flex items-start gap-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <span className="font-bold">3.</span>
            <span>Check your wallet for tickets</span>
          </li>
          <li
            className={`flex items-start gap-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <span className="font-bold">4.</span>
            <span>If no payment was made, try purchasing again</span>
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => window.location.reload()}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${
            isDarkMode
              ? "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
              : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Status
        </button>
        <button
          onClick={() => navigate(-1)}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
            isDarkMode
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-200 hover:bg-gray-300 text-gray-900"
          }`}
        >
          Try Again
        </button>
      </div>
    </motion.div>
  );

  const StatusFailed = () => {
    // Parse enhanced failure info (backward compatible with fallbacks)
    const failureReason = orderStatus?.failureReason || "UNKNOWN_ERROR";
    const userMessage =
      orderStatus?.userMessage || "Your payment could not be processed";
    const retryable = orderStatus?.retryable !== false; // Default to true for backward compatibility
    const failureIcon = orderStatus?.failureIcon || "❌";
    const failureColor = orderStatus?.failureColor || "red";
    const guidance = orderStatus?.guidance;
    const suggestedAction = orderStatus?.suggestedAction;

    // Determine UI colors based on failure type
    const bgColor =
      {
        yellow: "bg-yellow-100 dark:bg-yellow-900/20",
        orange: "bg-orange-100 dark:bg-orange-900/20",
        red: "bg-red-100 dark:bg-red-900/20",
      }[failureColor] || "bg-red-100 dark:bg-red-900/20";

    const textColor =
      {
        yellow: "text-yellow-600 dark:text-yellow-400",
        orange: "text-orange-600 dark:text-orange-400",
        red: "text-red-600 dark:text-red-400",
      }[failureColor] || "text-red-600 dark:text-red-400";

    // Get user-friendly title based on failure reason
    const getTitle = () => {
      const titles = {
        USER_CANCELLED: "Payment Cancelled",
        REQUEST_TIMEOUT: "Payment Timed Out",
        TIMEOUT_NO_RESPONSE: "No Response Received",
        WRONG_PIN: "Incorrect PIN",
        INSUFFICIENT_FUNDS: "Insufficient Balance",
        TRANSACTION_EXPIRED: "Transaction Expired",
        SYSTEM_BUSY: "System Busy",
        UNKNOWN_ERROR: "Payment Failed",
      };
      return titles[failureReason] || "Payment Failed";
    };

    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center max-w-3xl mx-auto"
      >
        {/* Icon - Dynamic based on failure type */}
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${bgColor} mb-6 shadow-lg`}
        >
          <span className="text-5xl" role="img" aria-label="status icon">
            {failureIcon}
          </span>
        </div>

        {/* Title - Dynamic based on failure type */}
        <h1
          className={`text-3xl font-bold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {getTitle()}
        </h1>

        {/* User Message - From PayHero/backend */}
        <p
          className={`text-lg mb-4 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {userMessage}
        </p>

        {/* Guidance - Actionable advice */}
        {guidance && (
          <p
            className={`text-md mb-6 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {guidance}
          </p>
        )}

        {/* Order Details */}
        {orderStatus && (
          <div
            className={`p-6 mb-6 shadow-xl ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Order Number
              </span>
              <span
                className={`font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {orderStatus.orderNumber}
              </span>
            </div>
            {orderStatus.totalAmount && (
              <div className="flex items-center justify-between mb-4">
                <span
                  className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                >
                  Amount
                </span>
                <span
                  className={`font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {orderStatus.currency} {orderStatus.totalAmount}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Status
              </span>
              <span className={`font-bold ${textColor}`}>{getTitle()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {retryable && (
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          )}
          <button
            onClick={() => navigate("/events")}
            className={`px-6 py-4 rounded-lg font-semibold transition-all shadow-lg ${
              isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Browse Events
          </button>
        </div>

        {/* Help Text for Specific Failure Types */}
        {suggestedAction === "TOPUP" && (
          <div
            className={`mt-6 p-4 ${
              isDarkMode
                ? "bg-blue-900/20 border border-blue-500/30"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? "text-blue-300" : "text-blue-800"
              }`}
            >
              💡 Need to top up?
            </h3>
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Dial *234# to check your M-PESA balance or visit an M-PESA agent
              to top up your account.
            </p>
          </div>
        )}

        {suggestedAction === "CHECK_PHONE" && (
          <div
            className={`mt-6 p-4 ${
              isDarkMode
                ? "bg-orange-900/20 border border-orange-500/30"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? "text-orange-300" : "text-orange-800"
              }`}
            >
              📱 Check your phone
            </h3>
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              You may have a pending M-PESA prompt on your phone. Check your
              messages and notifications.
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  // Always show status UI (StatusPending has its own loading states)
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="section-modern py-8 md:py-12">
        <div className="container-modern max-w-7xl">
          <AnimatePresence mode="wait">
            {error === "timeout" && <StatusTimeout key="timeout" />}
            {(orderStatus?.paymentStatus === "completed" ||
              orderStatus?.paymentStatus === "paid") &&
              !error && <StatusSuccess key="success" />}
            {orderStatus?.paymentStatus === "failed" && !error && (
              <StatusFailed key="failed" />
            )}
            {orderStatus?.paymentStatus === "cancelled" && !error && (
              <StatusFailed key="cancelled" />
            )}
            {orderStatus?.paymentStatus === "processing" && !error && (
              <StatusProcessing key="processing" />
            )}
            {(orderStatus?.paymentStatus === "pending" || !orderStatus) &&
              !error && <StatusPending key="pending" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
