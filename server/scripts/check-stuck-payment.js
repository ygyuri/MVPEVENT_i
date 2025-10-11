#!/usr/bin/env node

const mongoose = require('mongoose');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/event_i?authSource=admin';

async function checkStuckPayment() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find most recent order
    const recentOrder = await Order.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!recentOrder) {
      console.log('❌ No orders found in database');
      process.exit(0);
    }

    console.log('📋 MOST RECENT ORDER:');
    console.log('='.repeat(60));
    console.log(`Order ID:        ${recentOrder._id}`);
    console.log(`Order Number:    ${recentOrder.orderNumber}`);
    console.log(`Status:          ${recentOrder.status}`);
    console.log(`Payment Status:  ${recentOrder.paymentStatus}`);
    console.log(`Total Amount:    KES ${recentOrder.totalAmount}`);
    console.log(`Created:         ${recentOrder.createdAt}`);
    console.log(`User ID:         ${recentOrder.userId || 'N/A'}`);
    console.log(`Event ID:        ${recentOrder.eventId || 'N/A'}`);
    
    if (recentOrder.payment) {
      console.log('\n💳 PAYMENT DETAILS:');
      console.log('-'.repeat(60));
      console.log(`Provider:        ${recentOrder.payment.provider || 'N/A'}`);
      console.log(`Status:          ${recentOrder.payment.status || 'N/A'}`);
      console.log(`Transaction ID:  ${recentOrder.payment.transactionId || 'N/A'}`);
      console.log(`M-PESA Receipt:  ${recentOrder.payment.mpesaReceiptNumber || 'N/A'}`);
      console.log(`Paid At:         ${recentOrder.payment.paidAt || 'Not paid yet'}`);
    }

    console.log('\n');

    // Check for stuck payments
    if (recentOrder.paymentStatus === 'processing' || recentOrder.paymentStatus === 'pending') {
      console.log('⚠️  ORDER IS STUCK IN PROCESSING STATE');
      console.log('\nPossible reasons:');
      console.log('  1. Callback URL was incorrect (localhost instead of ngrok)');
      console.log('  2. PayHero webhook failed to reach server');
      console.log('  3. User cancelled payment');
      console.log('\nTo fix manually, you can update the order status in MongoDB');
    } else if (recentOrder.paymentStatus === 'paid') {
      console.log('✅ Payment completed successfully!');
      
      // Check if tickets have QR codes
      const Ticket = require('../models/Ticket');
      const tickets = await Ticket.find({ orderId: recentOrder._id }).lean();
      
      console.log(`\n🎫 TICKETS (${tickets.length}):`);
      tickets.forEach((ticket, i) => {
        console.log(`  ${i + 1}. ${ticket.ticketNumber} - ${ticket.status} - QR: ${ticket.qrCode ? '✅' : '❌'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStuckPayment();

