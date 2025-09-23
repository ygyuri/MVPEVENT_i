const axios = require('axios');

class PesapalService {
  constructor() {
    // Sandbox by default; can be overridden via env
    this.baseUrl = process.env.PESAPAL_BASE_URL || 'https://cybqa.pesapal.com/pesapalv3';
    this.defaultConsumerKey = process.env.PESAPAL_CONSUMER_KEY || '';
    this.defaultConsumerSecret = process.env.PESAPAL_CONSUMER_SECRET || '';
  }

  async requestToken(consumerKey, consumerSecret) {
    const key = consumerKey || this.defaultConsumerKey;
    const secret = consumerSecret || this.defaultConsumerSecret;
    try {
      const url = `${this.baseUrl}/api/Auth/RequestToken`;
      const { data } = await axios.post(url, {
        consumer_key: key,
        consumer_secret: secret,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      return { success: true, token: data?.token || data?.Token || null, raw: data };
    } catch (error) {
      const apiError = error.response?.data || error.message;
      console.error('❌ Pesapal token request failed:', apiError);
      return { success: false, error: apiError };
    }
  }

  async submitOrder({ token, callbackUrl, amount, description, currency = 'KES', reference, customer }) {
    try {
      const url = `${this.baseUrl}/api/Transactions/SubmitOrderRequest`; // typical v3 endpoint
      const payload = {
        id: reference,
        currency,
        amount,
        description,
        callback_url: callbackUrl,
        notification_id: reference,
        billing_address: {
          email_address: customer?.email,
          phone_number: customer?.phone,
          first_name: customer?.firstName,
          last_name: customer?.lastName,
        },
      };
      const { data } = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return { success: true, data };
    } catch (error) {
      const apiError = error.response?.data || error.message;
      console.error('❌ Pesapal submit order failed:', apiError);
      return { success: false, error: apiError };
    }
  }

  async getTransactionStatus({ token, trackingId }) {
    try {
      const url = `${this.baseUrl}/api/Transactions/GetTransactionStatus?trackingId=${encodeURIComponent(trackingId)}`;
      const { data } = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { success: true, data };
    } catch (error) {
      const apiError = error.response?.data || error.message;
      console.error('❌ Pesapal status failed:', apiError);
      return { success: false, error: apiError };
    }
  }
}

module.exports = new PesapalService();


