#!/usr/bin/env node

/**
 * PayHero Configuration Diagnostic
 * 
 * This script checks your PayHero configuration and identifies issues
 */

require('dotenv').config();
const axios = require('axios');

const config = {
  baseUrl: 'https://backend.payhero.co.ke/api/v2',
  auth: process.env.PAYHERO_BASIC_AUTH_TOKEN || 'Basic UHFJS1FRaDg3bDA4WWVrbEIwbE46WDRBSDFLRGY0ODI2Q3VoNW9FQ1QybFd0bzJ6WTVVZElNekVyYlNpMA==',
  channelId: process.env.PAYHERO_CHANNEL_ID || '3767',
  accountId: process.env.PAYHERO_ACCOUNT_ID || '3140',
  callbackUrl: process.env.PAYHERO_CALLBACK_URL || 'http://localhost:5000/api/payhero/callback'
};

async function diagnosePayhero() {
  console.log('🔍 PayHero Configuration Diagnostic');
  console.log('=====================================\n');

  // 1. Check Configuration
  console.log('📋 Current Configuration:');
  console.log(`   Account ID: ${config.accountId}`);
  console.log(`   Channel ID: ${config.channelId}`);
  console.log(`   Callback URL: ${config.callbackUrl}\n`);

  // 2. Check Callback URL Accessibility
  console.log('🌐 Callback URL Analysis:');
  if (config.callbackUrl.includes('localhost') || config.callbackUrl.includes('127.0.0.1')) {
    console.log('   ❌ CRITICAL ISSUE: Callback URL uses localhost!');
    console.log('   PayHero CANNOT reach localhost from their servers.');
    console.log('   \n   💡 Solution:');
    console.log('   1. Install ngrok: brew install ngrok');
    console.log('   2. Run: ngrok http 5000');
    console.log('   3. Update PAYHERO_CALLBACK_URL in .env with ngrok URL');
    console.log('   4. Restart server: docker restart event_i_server\n');
  } else {
    console.log('   ✅ Callback URL is public (good!)');
    console.log(`   Testing if URL is reachable...\n`);
    
    try {
      await axios.get(config.callbackUrl.replace('/api/payhero/callback', '/health'), { timeout: 5000 });
      console.log('   ✅ Server is reachable from internet\n');
    } catch (err) {
      console.log('   ⚠️  Could not reach server (might be OK if health endpoint missing)\n');
    }
  }

  // 3. Test PayHero API Connection
  console.log('🔌 Testing PayHero API Connection:');
  try {
    const response = await axios.get(`${config.baseUrl}/wallets`, {
      headers: {
        'Authorization': config.auth,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('   ✅ API Connection Successful!');
    console.log(`   Found ${response.data.data?.length || 0} wallet(s)\n`);

    if (response.data.data && response.data.data.length > 0) {
      console.log('💰 Wallet Balances:');
      response.data.data.forEach(wallet => {
        console.log(`   - ${wallet.account_name}: ${wallet.currency} ${wallet.balance}`);
      });
      console.log('');
    }

  } catch (error) {
    console.log('   ❌ API Connection Failed!');
    console.log(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.log('');
  }

  // 4. Check Payment Channel
  console.log(`🎯 Checking Payment Channel ${config.channelId}:`);
  try {
    const response = await axios.get(`${config.baseUrl}/payment_channels/${config.channelId}`, {
      headers: {
        'Authorization': config.auth,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const channel = response.data.data || response.data;
    console.log('   ✅ Channel Found!');
    console.log(`   Name: ${channel.account_name || channel.name || 'N/A'}`);
    console.log(`   Status: ${channel.status || 'N/A'}`);
    console.log(`   Provider: ${channel.provider || 'N/A'}`);
    console.log(`   Balance: ${channel.currency || 'KES'} ${channel.balance || 0}\n`);

    if (channel.status !== 'active') {
      console.log('   ⚠️  WARNING: Channel is not active!');
      console.log('   Contact PayHero support to activate channel.\n');
    }

  } catch (error) {
    console.log('   ❌ Channel Not Found or Error!');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status === 404) {
      console.log(`   💡 Channel ${config.channelId} does not exist or you don't have access.`);
      console.log('   Check your PayHero dashboard for the correct channel ID.\n');
    } else if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}\n`);
    }
  }

  // 5. Check Recent Orders
  console.log('📦 Recent Orders Status:');
  try {
    const mongoose = require('mongoose');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/event_i?authSource=admin';
    
    await mongoose.connect(mongoURI);
    const Order = require('../models/Order');
    
    const recentOrders = await Order.find({})
      .select('orderNumber status paymentStatus payment.paymentReference payment.checkoutRequestId createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recentOrders.length === 0) {
      console.log('   No orders found\n');
    } else {
      recentOrders.forEach((order, idx) => {
        console.log(`   ${idx + 1}. ${order.orderNumber}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Payment: ${order.paymentStatus}`);
        console.log(`      Reference: ${order.payment?.paymentReference || 'N/A'}`);
        console.log(`      Created: ${new Date(order.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    await mongoose.disconnect();

  } catch (error) {
    console.log(`   ⚠️  Could not fetch orders: ${error.message}\n`);
  }

  // 6. Summary & Recommendations
  console.log('📊 Summary:');
  console.log('===========');
  
  if (config.callbackUrl.includes('localhost')) {
    console.log('❌ CRITICAL: Callback URL is localhost');
    console.log('   → PayHero cannot send payment confirmations');
    console.log('   → Payments will appear to hang in "processing"');
    console.log('   → Fix: Use ngrok or deploy to production\n');
  } else {
    console.log('✅ Callback URL is public\n');
  }

  console.log('🎯 Next Steps:');
  console.log('1. If using localhost: Set up ngrok immediately');
  console.log('2. Update PAYHERO_CALLBACK_URL in .env');
  console.log('3. Restart server: docker restart event_i_server');
  console.log('4. Test with small payment (KES 10)');
  console.log('5. Monitor logs: docker logs -f event_i_server\n');

  process.exit(0);
}

diagnosePayhero().catch(err => {
  console.error('❌ Diagnostic failed:', err);
  process.exit(1);
});





