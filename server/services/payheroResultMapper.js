/**
 * PayHero Result Code Mapper Service
 * 
 * Maps PayHero result codes to user-friendly messages and failure reasons.
 * Based on PayHero API documentation and M-PESA result codes.
 * 
 * @module payheroResultMapper
 */

/**
 * PayHero/M-PESA result code mappings
 * 
 * Result Codes:
 * - 0: Success
 * - 1: User cancelled
 * - 1032: Request timeout
 * - 1037: Timeout - no response from user
 * - 2001: Wrong PIN attempts exceeded
 * - 1001: Insufficient funds
 * - 1019: Transaction expired
 * - 17: System busy
 * 
 * @typedef {Object} FailureMapping
 * @property {string} status - Payment status (cancelled, failed)
 * @property {string} orderStatus - Order status (cancelled, pending)
 * @property {string} reason - Machine-readable failure reason
 * @property {string} message - User-friendly message
 * @property {string} icon - Emoji icon for UI
 * @property {string} color - UI color theme (yellow, orange, red)
 * @property {boolean} retryable - Whether user can retry immediately
 * @property {number} retryDelay - Suggested delay before retry (ms)
 * @property {string|null} guidance - Actionable guidance for user
 * @property {string|null} suggestedAction - Suggested alternative action
 */

const FAILURE_MAPPINGS = {
  // User-initiated cancellation
  1: {
    status: 'cancelled',
    orderStatus: 'cancelled',
    reason: 'USER_CANCELLED',
    message: 'You cancelled the payment request',
    icon: '🚫',
    color: 'yellow',
    retryable: true,
    retryDelay: 0,
    guidance: 'Would you like to try again?',
    suggestedAction: null
  },
  
  // Request timeout - user didn't see/respond to prompt
  1032: {
    status: 'cancelled',
    orderStatus: 'cancelled',
    reason: 'REQUEST_TIMEOUT',
    message: 'Payment request timed out',
    icon: '⏰',
    color: 'orange',
    retryable: true,
    retryDelay: 0,
    guidance: 'The STK push expired before you could respond. Please try again and respond faster.',
    suggestedAction: null
  },
  
  // No response from user
  1037: {
    status: 'failed',
    orderStatus: 'pending',
    reason: 'TIMEOUT_NO_RESPONSE',
    message: 'No response received from M-PESA',
    icon: '⌛',
    color: 'orange',
    retryable: false,
    retryDelay: 30000,
    guidance: 'Check your phone for any pending M-PESA prompts. The payment may still be processing.',
    suggestedAction: 'CHECK_PHONE'
  },
  
  // Wrong PIN
  2001: {
    status: 'failed',
    orderStatus: 'pending',
    reason: 'WRONG_PIN',
    message: 'Incorrect M-PESA PIN entered',
    icon: '🔐',
    color: 'red',
    retryable: true,
    retryDelay: 2000,
    guidance: 'Please double-check your M-PESA PIN and try again.',
    suggestedAction: null
  },
  
  // Insufficient funds
  1001: {
    status: 'failed',
    orderStatus: 'pending',
    reason: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient M-PESA balance',
    icon: '💰',
    color: 'red',
    retryable: true,
    retryDelay: 0,
    guidance: 'Your M-PESA account does not have enough funds for this transaction.',
    suggestedAction: 'TOPUP'
  },
  
  // Transaction expired
  1019: {
    status: 'failed',
    orderStatus: 'cancelled',
    reason: 'TRANSACTION_EXPIRED',
    message: 'Transaction has expired',
    icon: '⏰',
    color: 'orange',
    retryable: true,
    retryDelay: 0,
    guidance: 'The payment window has closed. Please create a new order.',
    suggestedAction: null
  },
  
  // System busy
  17: {
    status: 'failed',
    orderStatus: 'pending',
    reason: 'SYSTEM_BUSY',
    message: 'M-PESA system is currently busy',
    icon: '🔄',
    color: 'orange',
    retryable: true,
    retryDelay: 5000,
    guidance: 'The M-PESA system is experiencing high traffic. Please try again in a few moments.',
    suggestedAction: null
  }
};

/**
 * Default fallback mapping for unknown result codes
 */
const DEFAULT_FAILURE_MAPPING = {
  status: 'failed',
  orderStatus: 'pending',
  reason: 'UNKNOWN_ERROR',
  message: null, // Will be populated from PayHero response
  icon: '❌',
  color: 'red',
  retryable: true,
  retryDelay: 5000,
  guidance: 'Please try again or contact support if the issue persists.',
  suggestedAction: 'CONTACT_SUPPORT'
};

/**
 * Parse PayHero callback response and map to enhanced failure info
 * 
 * @param {Object} paymentInfo - PayHero callback payload
 * @param {number} paymentInfo.resultCode - PayHero result code
 * @param {string} paymentInfo.status - PayHero status
 * @param {string} [paymentInfo.resultDesc] - PayHero result description
 * @returns {Object} Enhanced payment result info
 */
function parsePaymentResult(paymentInfo) {
  // Validate input
  if (!paymentInfo || typeof paymentInfo !== 'object') {
    console.error('❌ Invalid paymentInfo provided to parsePaymentResult');
    return {
      ...DEFAULT_FAILURE_MAPPING,
      message: 'Invalid payment response received',
      rawResponse: paymentInfo
    };
  }

  const resultCode = parseInt(paymentInfo.resultCode);
  
  // Success case
  if (resultCode === 0 && paymentInfo.status === 'Success') {
    return {
      status: 'completed',
      orderStatus: 'paid',
      reason: 'SUCCESS',
      message: 'Payment completed successfully',
      icon: '✅',
      color: 'green',
      retryable: false,
      retryDelay: 0,
      guidance: null,
      suggestedAction: null,
      rawResponse: paymentInfo
    };
  }
  
  // Failure cases - look up in mappings
  const mapping = FAILURE_MAPPINGS[resultCode] || DEFAULT_FAILURE_MAPPING;
  
  // Use PayHero's result description if available and no custom message
  const message = mapping.message || paymentInfo.resultDesc || 'Payment failed';
  
  return {
    ...mapping,
    message,
    resultCode,
    resultDesc: paymentInfo.resultDesc,
    rawResponse: paymentInfo
  };
}

/**
 * Get user-friendly title for failure reason
 * 
 * @param {string} reason - Failure reason code
 * @returns {string} User-friendly title
 */
function getFailureTitle(reason) {
  const titles = {
    SUCCESS: 'Payment Successful',
    USER_CANCELLED: 'Payment Cancelled',
    REQUEST_TIMEOUT: 'Payment Timed Out',
    TIMEOUT_NO_RESPONSE: 'No Response Received',
    WRONG_PIN: 'Incorrect PIN',
    INSUFFICIENT_FUNDS: 'Insufficient Balance',
    TRANSACTION_EXPIRED: 'Transaction Expired',
    SYSTEM_BUSY: 'System Busy',
    UNKNOWN_ERROR: 'Payment Failed'
  };
  
  return titles[reason] || 'Payment Failed';
}

/**
 * Check if a failure reason is retryable
 * 
 * @param {string} reason - Failure reason code
 * @returns {boolean} Whether the payment can be retried
 */
function isRetryable(reason) {
  const nonRetryable = ['TIMEOUT_NO_RESPONSE', 'SUCCESS'];
  return !nonRetryable.includes(reason);
}

/**
 * Get analytics category for failure reason
 * Used for grouping similar failures in analytics
 * 
 * @param {string} reason - Failure reason code
 * @returns {string} Analytics category
 */
function getAnalyticsCategory(reason) {
  const categories = {
    USER_CANCELLED: 'user_action',
    REQUEST_TIMEOUT: 'timeout',
    TIMEOUT_NO_RESPONSE: 'timeout',
    WRONG_PIN: 'user_error',
    INSUFFICIENT_FUNDS: 'user_error',
    TRANSACTION_EXPIRED: 'timeout',
    SYSTEM_BUSY: 'system_error',
    UNKNOWN_ERROR: 'system_error'
  };
  
  return categories[reason] || 'unknown';
}

module.exports = {
  parsePaymentResult,
  getFailureTitle,
  isRetryable,
  getAnalyticsCategory,
  FAILURE_MAPPINGS // Export for testing
};

