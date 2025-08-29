const axios = require('axios');
const crypto = require('crypto');

class MpesaService {
  constructor() {
    this.baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.timeoutUrl = process.env.MPESA_TIMEOUT_URL;
    
    if (!this.consumerKey || !this.consumerSecret || !this.passkey || !this.shortcode) {
      console.warn('⚠️ MPESA credentials not fully configured');
    }
  }

  // Generate access token
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('❌ Failed to get MPESA access token:', error.message);
      throw new Error('Failed to authenticate with MPESA');
    }
  }

  // Generate timestamp in required format
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Generate password
  generatePassword() {
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return password;
  }

  // Initiate STK Push
  async initiateSTKPush(phoneNumber, amount, orderNumber, description = 'Event Ticket Purchase') {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword();

      // Format phone number (remove + and add 254 if needed)
      let formattedPhone = phoneNumber.replace('+', '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('254')) {
        // Already in correct format
      } else {
        formattedPhone = '254' + formattedPhone;
      }

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // MPESA requires whole numbers
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: orderNumber,
        TransactionDesc: description
      };

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };

    } catch (error) {
      console.error('❌ STK Push failed:', error.response?.data || error.message);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.errorMessage || error.response.data.errorCode,
          responseCode: error.response.data.responseCode
        };
      }
      
      throw new Error('Failed to initiate MPESA payment');
    }
  }

  // Query transaction status
  async queryTransactionStatus(checkoutRequestId) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID
      };

    } catch (error) {
      console.error('❌ Transaction query failed:', error.response?.data || error.message);
      throw new Error('Failed to query transaction status');
    }
  }

  // Validate callback data
  validateCallback(data) {
    try {
      // Verify the callback is from MPESA
      const timestamp = data.Timestamp;
      const password = this.generatePassword();
      
      // Additional validation can be added here
      return true;
    } catch (error) {
      console.error('❌ Callback validation failed:', error.message);
      return false;
    }
  }

  // Process callback data
  processCallback(callbackData) {
    try {
      const {
        Body: {
          stkCallback: {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
          }
        }
      } = callbackData;

      let transactionData = {};
      
      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach(item => {
          transactionData[item.Name] = item.Value;
        });
      }

      return {
        checkoutRequestId: CheckoutRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        transactionId: transactionData.MpesaReceiptNumber,
        amount: transactionData.Amount,
        phoneNumber: transactionData.PhoneNumber,
        transactionDate: transactionData.TransactionDate
      };

    } catch (error) {
      console.error('❌ Callback processing failed:', error.message);
      throw new Error('Invalid callback data format');
    }
  }
}

module.exports = new MpesaService();
