/**
 * Test Bulk Resend Service
 * Tests the bulk resend functionality to ensure emails are sent
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Load all models first
require('../models/User');
require('../models/Event');
require('../models/Order');
require('../models/Ticket');

const bulkResendService = require('../services/bulkResendService');

async function testBulkResend() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📧 Starting bulk resend test (processing 2 orders max)...\n');
    
    const stats = await bulkResendService.resendTicketsForOrders({ 
      batchSize: 2 // Process only 2 orders for testing
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 BULK RESEND TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Orders found:        ${stats.totalOrdersFound}`);
    console.log(`Orders processed:    ${stats.totalOrdersProcessed}`);
    console.log(`Tickets updated:     ${stats.totalTicketsUpdated}`);
    console.log(`Emails sent:         ${stats.totalEmailsSent}`);
    console.log(`Errors:              ${stats.totalErrors}`);
    
    if (stats.endTime && stats.startTime) {
      const duration = (stats.endTime - stats.startTime) / 1000;
      console.log(`Duration:            ${duration.toFixed(2)}s`);
    }

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.slice(0, 5).forEach((error, i) => {
        console.log(`\n  ${i + 1}. Order: ${error.orderNumber || error.orderId || 'Unknown'}`);
        console.log(`     Error: ${error.error || error.message}`);
      });
      if (stats.errors.length > 5) {
        console.log(`\n  ... and ${stats.errors.length - 5} more errors`);
      }
    }

    if (stats.totalEmailsSent > 0) {
      console.log('\n✅ SUCCESS! Emails were sent successfully!');
      console.log('   Check your email inbox (or Ethereal inbox if using test email service)');
    } else {
      console.log('\n⚠️  No emails were sent. This could mean:');
      console.log('   - No tickets found for the orders');
      console.log('   - Email sending failed (check errors above)');
    }

    console.log('\n' + '='.repeat(60));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testBulkResend();





