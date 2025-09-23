const axios = require('axios');
const payheroConfig = require('../config/payhero');

class PayheroService {
  constructor() {
    this.baseUrl = payheroConfig.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': payheroConfig.basicAuthToken
    };
  }

  /**
   * Get service wallet balance
   */
  async getServiceWalletBalance() {
    try {
      const response = await axios.get(`${this.baseUrl}${payheroConfig.endpoints.wallets}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching service wallet balance:', error.response?.data || error.message);
      throw new Error('Failed to fetch service wallet balance');
    }
  }

  /**
   * Get payments wallet balance
   */
  async getPaymentsWalletBalance(channelId) {
    try {
      const response = await axios.get(`${this.baseUrl}${payheroConfig.endpoints.paymentChannels}/${channelId}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching payments wallet balance:', error.response?.data || error.message);
      throw new Error('Failed to fetch payments wallet balance');
    }
  }

  /**
   * Initiate MPESA STK Push payment
   */
  async initiatePayment(paymentData) {
    try {
      const payload = {
        amount: Math.round(paymentData.amount), // Ensure integer
        phone_number: paymentData.phoneNumber,
        channel_id: parseInt(paymentData.channelId || payheroConfig.defaultChannelId),
        provider: paymentData.provider || payheroConfig.provider,
        external_reference: paymentData.externalReference,
        customer_name: paymentData.customerName,
        callback_url: paymentData.callbackUrl || payheroConfig.callbackUrl
      };

      // Add network_code for sasapay provider
      if (payload.provider === 'sasapay') {
        payload.network_code = payheroConfig.networkCode;
      }

      console.log('PAYHERO Payment Request:', payload);

      const response = await axios.post(`${this.baseUrl}${payheroConfig.endpoints.payments}`, payload, {
        headers: this.headers
      });

      console.log('PAYHERO Payment Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error initiating PAYHERO payment:', error.response?.data || error.message);
      
      // Provide detailed error messages
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          throw new Error(`PayHero API Error: ${errorData.message}`);
        } else if (errorData.error) {
          throw new Error(`PayHero API Error: ${errorData.error}`);
        } else {
          throw new Error(`PayHero API Error: ${JSON.stringify(errorData)}`);
        }
      } else if (error.message) {
        throw new Error(`PayHero Service Error: ${error.message}`);
      } else {
        throw new Error('Failed to initiate PayHero payment - Unknown error occurred');
      }
    }
  }

  /**
   * Calculate payment fees
   */
  calculateFees(amount) {
    const processingFee = amount * payheroConfig.fees.processingFee;
    const fixedFee = payheroConfig.fees.fixedFee;
    const totalFees = processingFee + fixedFee;
    const totalAmount = amount + totalFees;

    return {
      subtotal: amount,
      processingFee: Math.round(processingFee * 100) / 100,
      fixedFee: fixedFee,
      totalFees: Math.round(totalFees * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  /**
   * Generate unique external reference
   */
  generateExternalReference(prefix = 'EVT') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentReference) {
    try {
      console.log('🔍 Verifying payment with reference:', paymentReference);
      
      // For now, we'll implement a simple verification
      // In a real implementation, you'd call PayHero's payment status API
      // or check your database for payment confirmation from webhooks
      
      // This is a placeholder - you should implement actual verification
      // based on PayHero's API or your webhook callbacks
      return {
        success: true,
        status: 'verified',
        message: 'Payment verification placeholder - implement actual verification'
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Payment verification failed'
      };
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it starts with 254 (Kenya country code)
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // Check if it starts with 0 (local format)
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    // Check if it starts with 7 (mobile number without country code)
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    throw new Error('Invalid phone number format. Please use format: 254XXXXXXXXX or 07XXXXXXXX');
  }

  /**
   * Process payment callback
   */
  async processCallback(callbackData) {
    try {
      console.log('PAYHERO Callback received:', callbackData);
      
      // Extract payment information from callback
      const paymentInfo = {
        externalReference: callbackData.response?.ExternalReference,
        checkoutRequestId: callbackData.response?.CheckoutRequestID,
        amount: callbackData.response?.Amount,
        phone: callbackData.response?.Phone,
        status: callbackData.response?.Status,
        resultCode: callbackData.response?.ResultCode,
        resultDesc: callbackData.response?.ResultDesc,
        mpesaReceiptNumber: callbackData.response?.MpesaReceiptNumber,
        merchantRequestId: callbackData.response?.MerchantRequestID
      };

      return paymentInfo;
    } catch (error) {
      console.error('Error processing PAYHERO callback:', error);
      throw new Error('Failed to process payment callback');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(externalReference) {
    try {
      // Note: PAYHERO doesn't have a direct status check endpoint
      // Status updates come via callbacks
      // This method can be used to validate external reference format
      return {
        externalReference,
        status: 'pending', // Default status
        message: 'Payment status will be updated via callback'
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error('Failed to check payment status');
    }
  }
}

module.exports = new PayheroService();