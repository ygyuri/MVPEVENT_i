#!/usr/bin/env node

const mongoose = require('mongoose');
const crypto = require('crypto');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const EmailService = require('../services/emailService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/event_i?authSource=admin';

async function fixStuckOrder(orderId, mpesaReceipt) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      console.log(`❌ Order ${orderId} not found`);
      process.exit(1);
    }

    // Get user and event separately
    const User = require('../models/User');
    const Event = require('../models/Event');
    
    const user = order.userId ? await User.findById(order.userId) : null;
    const event = order.eventId ? await Event.findById(order.eventId) : null;
    
    // Attach to order for later use
    order.userId = user;
    order.eventId = event;

    console.log('📋 FIXING ORDER:');
    console.log('='.repeat(60));
    console.log(`Order Number:    ${order.orderNumber}`);
    console.log(`Current Status:  ${order.paymentStatus}`);
    console.log(`Amount:          KES ${order.totalAmount}`);
    console.log('\n⏳ Processing...\n');

    // Update order to completed
    order.status = 'completed';
    order.paymentStatus = 'completed';
    order.payment = {
      status: 'completed',
      provider: 'm-pesa',
      transactionId: mpesaReceipt || `MANUAL-${Date.now()}`,
      mpesaReceiptNumber: mpesaReceipt || `MANUAL-${Date.now()}`,
      paidAt: new Date(),
      amount: order.totalAmount
    };
    await order.save();
    console.log('✅ Order updated to PAID');

    // Generate QR codes for tickets
    const tickets = await Ticket.find({ orderId: order._id });
    console.log(`\n🎫 Generating QR codes for ${tickets.length} ticket(s)...`);

    for (const ticket of tickets) {
      if (!ticket.qrCode) {
        // Generate encrypted QR code payload
        const qrPayload = {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          eventId: order.eventId._id.toString(),
          orderId: order._id.toString(),
          issuedAt: new Date().toISOString()
        };

        // Create unique nonce and signature
        const nonce = crypto.randomBytes(16).toString('hex');
        const signature = crypto
          .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
          .update(JSON.stringify(qrPayload) + nonce)
          .digest('hex');

        const encryptedQRData = {
          ...qrPayload,
          nonce,
          signature
        };

        // Generate QR code image as base64
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(encryptedQRData), {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 300,
          margin: 2
        });

        // Update ticket
        ticket.qrCode = JSON.stringify(encryptedQRData);
        ticket.qrCodeUrl = qrCodeDataURL;
        ticket.qr = { nonce, signature, issuedAt: qrPayload.issuedAt };
        await ticket.save();
        console.log(`  ✅ QR code generated for ${ticket.ticketNumber}`);
      } else {
        console.log(`  ℹ️  QR code already exists for ${ticket.ticketNumber}`);
      }
    }

    // Send emails
    if (order.userId && order.userId.email) {
      console.log('\n📧 Sending emails...');
      
      try {
        // Send ticket email
        await EmailService.sendTicketEmail(
          order.userId.email,
          order.userId.firstName || 'Customer',
          order.eventId,
          tickets,
          order
        );
        console.log('  ✅ Ticket email sent');

        // Send receipt
        await EmailService.sendPaymentReceipt(
          order.userId.email,
          order.userId.firstName || 'Customer',
          order,
          order.eventId
        );
        console.log('  ✅ Receipt email sent');
      } catch (emailError) {
        console.log(`  ⚠️  Email error: ${emailError.message}`);
      }
    }

    console.log('\n✅ ORDER FIXED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`Order Number:    ${order.orderNumber}`);
    console.log(`Status:          ${order.paymentStatus}`);
    console.log(`M-PESA Receipt:  ${order.payment.mpesaReceiptNumber}`);
    console.log('\nUser should now see success on frontend! 🎉\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get order ID and receipt from command line
const orderId = process.argv[2];
const mpesaReceipt = process.argv[3];

if (!orderId) {
  console.log('Usage: node fix-stuck-order.js <orderId> [mpesaReceiptNumber]');
  console.log('\nExample:');
  console.log('  node fix-stuck-order.js 68e924c4c4cf95dd537e3550 SGL12345678');
  console.log('  node fix-stuck-order.js 68e924c4c4cf95dd537e3550');
  process.exit(1);
}

fixStuckOrder(orderId, mpesaReceipt);

