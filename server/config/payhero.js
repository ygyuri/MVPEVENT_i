// PAYHERO Configuration
const payheroConfig = {
  // API Credentials from documentation
  apiUsername: process.env.PAYHERO_API_USERNAME || 'PqIKQQh87l08YeklB0lN',
  apiPassword: process.env.PAYHERO_API_PASSWORD || 'X4AH1KDf4826Cuh5oECT2lWto2zY5UdIMzErbSi0',
  accountId: process.env.PAYHERO_ACCOUNT_ID || '3140',
  
  // Basic Auth Token (from documentation)
  basicAuthToken: process.env.PAYHERO_BASIC_AUTH_TOKEN || 'Basic UHFJS1FRaDg3bDA4WWVrbEIwbE46WDRBSDFLRGY0ODI2Q3VoNW9FQ1QybFd0bzJ6WTVVZElNekVyYlNpMA==',
  
  // API Endpoints
  baseUrl: 'https://backend.payhero.co.ke/api/v2',
  endpoints: {
    wallets: '/wallets',
    paymentChannels: '/payment_channels',
    payments: '/payments',
    withdraw: '/withdraw',
    topup: '/topup'
  },
  
  // Payment Configuration
  defaultChannelId: process.env.PAYHERO_CHANNEL_ID || '3424', // Your correct channel ID
  provider: 'm-pesa', // or 'sasapay' for wallet payments
  networkCode: '63902', // MPESA network code
  
  // Callback URLs
  callbackUrl: process.env.PAYHERO_CALLBACK_URL || 'https://your-domain.com/api/payhero/callback',
  successUrl: process.env.PAYHERO_SUCCESS_URL || 'https://your-domain.com/checkout/success',
  failedUrl: process.env.PAYHERO_FAILED_URL || 'https://your-domain.com/checkout/failed',
  
  // Payment Fees - No additional fees for now
  fees: {
    processingFee: 0, // No processing fee
    fixedFee: 0, // No fixed fee
    minimumAmount: 1 // Minimum payment amount
  }
};

module.exports = payheroConfig;
