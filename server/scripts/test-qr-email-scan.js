/**
 * Test Script: Generate Ticket with QR Code and Send Test Email via Ethereal
 * 
 * This script:
 * 1. Creates a test ticket with QR code using ticketService.issueQr() (same as wallet)
 * 2. Generates high-quality QR code image
 * 3. Sends email via Ethereal (test email service)
 * 4. You can then scan the QR code from the Ethereal email preview
 * 
 * Usage:
 *   node server/scripts/test-qr-email-scan.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const ticketService = require('../services/ticketService');
const mergedTicketReceiptService = require('../services/mergedTicketReceiptService');
const { connectMongoDB } = require('../config/database');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const Event = require('../models/Event');
const User = require('../models/User');

async function createTestTicketWithQR() {
  try {
    // Connect to MongoDB using the same method as the server
    // This ensures consistency and handles auth properly
    console.log('🔗 Connecting to MongoDB...\n');
    
    try {
      // Override MONGODB_URI to use 127.0.0.1 instead of localhost for Docker compatibility
      const originalMongoURI = process.env.MONGODB_URI;
      if (originalMongoURI && originalMongoURI.includes('localhost')) {
        process.env.MONGODB_URI = originalMongoURI.replace('localhost', '127.0.0.1');
        console.log('   Using 127.0.0.1 instead of localhost for Docker compatibility\n');
      } else if (!process.env.MONGODB_URI) {
        // Set default if not in .env
        process.env.MONGODB_URI = 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
      }
      
      // Use the server's database connection function
      await connectMongoDB();
      console.log('✅ Connected to MongoDB successfully\n');
    } catch (connectError) {
      console.error('❌ MongoDB connection failed:', connectError.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if MongoDB Docker container is running: docker ps | grep mongodb');
      console.error('   2. Verify MongoDB is accessible: docker exec event_i_mongodb mongosh --version');
      console.error('   3. Test auth: docker exec event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin');
      console.error('   4. Check .env file MONGODB_URI setting\n');
      throw connectError;
    }

    // Find organizer@example.com (the user you're logged in as)
    let organizer = await User.findOne({ email: 'organizer@example.com' });
    if (!organizer) {
      console.error('❌ organizer@example.com not found!');
      console.error('   Please make sure you have run the seed script first.');
      process.exit(1);
    }
    console.log(`✅ Found organizer: ${organizer.email} (${organizer._id})`);

    // Find test event created by this organizer
    // Try multiple common test event names/slugs
    let testEvent = await Event.findOne({ 
      organizer: organizer._id,
      $or: [
        { title: /test.*email/i },
        { slug: 'test-this-end-to-end' },
        { slug: 'test-event-for-updates' },
        { title: /test.*event/i }
      ],
      status: 'published'
    }).sort({ createdAt: -1 }); // Get most recent

    // If no test event found, find any published event by this organizer
    if (!testEvent) {
      testEvent = await Event.findOne({ 
        organizer: organizer._id,
        status: 'published'
      }).sort({ createdAt: -1 });
    }

    // If still no event, create one
    if (!testEvent) {
      testEvent = new Event({
        title: 'Test Emails Event',
        slug: `test-emails-event-${Date.now()}`,
        description: 'Test event for QR code scanning via email',
        organizer: organizer._id,
        dates: {
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // 3 hours later
        },
        location: {
          venueName: 'Test Venue',
          address: '123 Test St',
          city: 'Nairobi',
          country: 'KE'
        },
        ticketTypes: [{
          name: 'General Admission',
          price: 1000,
          quantity: 100
        }],
        status: 'published'
      });
      await testEvent.save();
      console.log(`✅ Created test event: ${testEvent.title} (${testEvent.slug})`);
    } else {
      console.log(`✅ Found test event: ${testEvent.title} (${testEvent.slug})`);
    }

    // Create a test customer for the ticket
    let testCustomer = await User.findOne({ email: 'customer@example.com' });
    if (!testCustomer) {
      testCustomer = new User({
        email: 'customer@example.com',
        firstName: 'Test',
        lastName: 'Customer',
        name: 'Test Customer',
        username: 'testcustomer',
        role: 'customer',
        accountStatus: 'active',
        emailVerified: true
      });
      await testCustomer.setPassword('password123');
      await testCustomer.save();
      console.log('✅ Created test customer');
    }

    // Create test order
    const testOrder = new Order({
      orderNumber: `TEST-${Date.now()}`,
      customer: {
        email: testCustomer.email,
        firstName: testCustomer.firstName,
        lastName: testCustomer.lastName,
        userId: testCustomer._id,
        phone: '+254700000000' // Required field
      },
      eventId: testEvent._id,
      items: [{
        eventId: testEvent._id,
        ticketType: 'General Admission',
        quantity: 1,
        price: 1000,
        unitPrice: 1000, // Required field
        subtotal: 1000, // Required field
        eventTitle: testEvent.title // Required field
      }],
      totalAmount: 1000,
      pricing: {
        currency: 'KES',
        subtotal: 1000,
        total: 1000,
        serviceFee: 0 // Required field
      },
      payment: {
        status: 'completed',
        paidAt: new Date(),
        mpesaReceiptNumber: `TEST-${Date.now()}`
      },
      paymentStatus: 'completed',
      status: 'completed',
      userId: testCustomer._id
    });
    await testOrder.save();
    console.log('✅ Created test order');

    // Create test ticket
    const testTicket = new Ticket({
      ticketNumber: `TKT-TEST-${Date.now()}`,
      eventId: testEvent._id,
      orderId: testOrder._id,
      ownerUserId: testCustomer._id,
      ticketType: 'General Admission',
      price: 1000,
      status: 'active',
      holder: {
        firstName: testCustomer.firstName,
        lastName: testCustomer.lastName,
        email: testCustomer.email,
        phone: '+254700000000' // Required field
      }
    });
    await testTicket.save();
    console.log('✅ Created test ticket');

    // Generate QR code using ticketService.issueQr() - SAME AS WALLET
    console.log('\n📱 Generating QR code using ticketService.issueQr()...');
    const qrResult = await ticketService.issueQr(testTicket._id.toString(), {
      rotate: false
    });
    console.log('✅ QR code generated:', {
      qrLength: qrResult.qr.length,
      qrPrefix: qrResult.qr.substring(0, 50) + '...',
      expiresAt: qrResult.expiresAt
    });

            // Generate QR code image - optimized for easy scanning
            const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
              errorCorrectionLevel: "M", // Medium error correction - easier to scan than "H"
              type: "image/png",
              width: 400, // Larger size for better scanning
              margin: 4, // Larger margin for better scanning
              color: {
                dark: "#000000", // Pure black for maximum contrast
                light: "#FFFFFF", // Pure white for maximum contrast
              },
            });

    // Update ticket with QR code
    testTicket.qrCode = qrResult.qr;
    testTicket.qrCodeUrl = qrCodeDataURL;
    await testTicket.save();
    console.log('✅ QR code image generated and saved to ticket');

    // Create Ethereal test account
    console.log('\n📧 Creating Ethereal test email account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ Ethereal account created:', {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: testAccount.smtp.host,
      imap: testAccount.imap.host
    });

    // Override mergedTicketReceiptService transporter with Ethereal test account
    // This allows us to test the actual email template
    mergedTicketReceiptService.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Send test email using the actual mergedTicketReceiptService
    // This tests the real email template with centered QR code
    console.log('\n📧 Sending test email using mergedTicketReceiptService...');
    const emailResult = await mergedTicketReceiptService.sendTicketAndReceipt({
      order: testOrder,
      tickets: [testTicket],
      customerEmail: testAccount.user, // Send to Ethereal inbox
      customerName: `${testCustomer.firstName} ${testCustomer.lastName}`,
      event: testEvent
    });

    const previewUrl = emailResult.previewUrl;

    console.log('✅ Test email sent successfully!');
    console.log('\n📧 Email Details:');
    console.log('   Message ID:', emailResult.messageId);
    console.log('   Preview URL:', previewUrl);
    console.log('\n🔍 Next Steps:');
    console.log('   1. Open the preview URL above in your browser');
    console.log('   2. You will see the ACTUAL email template with centered QR code');
    console.log('   3. Verify the QR code is centered and 350x350px in size');
    console.log('   4. Open the scanner in organizer dashboard');
    console.log('   5. Point camera at the QR code in the email');
    console.log('   6. It should scan instantly! ✅');
    console.log('\n📊 Test Summary:');
    console.log('   Ticket Number:', testTicket.ticketNumber);
    console.log('   Ticket ID:', testTicket._id.toString());
    console.log('   QR Format: New format (same as wallet)');
    console.log('   QR Image Size: 350x350px (centered in email)');
    console.log('   QR Error Correction: Level H (Highest)');
    console.log('   Email Template: mergedTicketReceiptService (actual production template)');
    console.log('\n✅ Test setup complete!');

    // Cleanup option (commented out - uncomment if you want to delete test data)
    // await testTicket.deleteOne();
    // await testOrder.deleteOne();
    // console.log('\n🧹 Test data cleaned up');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
createTestTicketWithQR();

