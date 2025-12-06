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
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const Event = require('../models/Event');
const User = require('../models/User');

async function createTestTicketWithQR() {
  try {
    // Connect to MongoDB - Use Docker MongoDB connection (same as server)
    // From host machine, connect via 127.0.0.1 (Docker port mapping)
    // From Docker container, use 'mongodb' hostname
    const dockerMongoURI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
    const mongoURI = dockerMongoURI;
    
    // Log connection attempt (hide credentials)
    const safeURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`🔗 Connecting to MongoDB: ${safeURI}\n`);
    
    const finalURI = mongoURI;
    
    try {
      await mongoose.connect(finalURI);
      console.log('✅ Connected to MongoDB successfully\n');
    } catch (connectError) {
      console.error('❌ MongoDB connection failed:', connectError.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if MongoDB Docker container is running: docker ps | grep mongodb');
      console.error('   2. Verify MongoDB is accessible: docker exec event_i_mongodb mongosh --version');
      console.error('   3. Connection string: mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin\n');
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

            // Generate HIGH QUALITY QR code image (optimized size for mobile)
            const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
              errorCorrectionLevel: "H", // Highest error correction
              type: "image/png",
              width: 350, // Optimized size for mobile (was 500)
              margin: 3,
              color: {
                dark: "#000000", // Pure black
                light: "#FFFFFF", // Pure white
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

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Extract base64 data from QR code image
    const base64Match = qrCodeDataURL.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Failed to extract base64 data from QR code');
    }
    const imageType = base64Match[1] || 'png';
    const base64Data = base64Match[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Send test email with QR code
    console.log('\n📧 Sending test email with QR code...');
    const mailOptions = {
      from: `"Event-i Test" <${testAccount.user}>`,
      to: testAccount.user, // Send to Ethereal inbox
      subject: `🧪 Test QR Code Email - Ticket ${testTicket.ticketNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test QR Code Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 30px;
            }
            .ticket-card {
              background: #f8f9fa;
              border: 2px solid #667eea;
              border-radius: 12px;
              padding: 24px;
              margin: 20px 0;
            }
            .qr-container {
              text-align: center;
              background: white;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .qr-code {
              width: 400px;
              height: 400px;
              border: 4px solid #667eea;
              border-radius: 10px;
              padding: 16px;
              background: white;
              display: block;
              margin: 0 auto;
            }
            .info-box {
              background: #e7f3ff;
              border-left: 4px solid #667eea;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧪 Test QR Code Email</h1>
            <p>This is a test email to verify QR code scanning</p>
          </div>

          <div class="ticket-card">
            <h2>Ticket Information</h2>
            <p><strong>Ticket Number:</strong> ${testTicket.ticketNumber}</p>
            <p><strong>Event:</strong> ${testEvent.title}</p>
            <p><strong>Organizer:</strong> organizer@example.com</p>
            <p><strong>Event ID:</strong> ${testEvent._id}</p>
            <p><strong>Ticket Type:</strong> ${testTicket.ticketType}</p>
            <p><strong>Holder:</strong> ${testTicket.holder.firstName} ${testTicket.holder.lastName}</p>
          </div>

          <div class="qr-container">
            <h3>📱 Scan This QR Code</h3>
            <p style="color: #666; margin-bottom: 20px;">
              This QR code uses the same format as wallet QR codes.<br>
              It should scan instantly with the scanner.
            </p>
            <img src="cid:qr-code" alt="QR Code" class="qr-code" style="width: 280px; height: 280px; max-width: 100%;" />
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              <strong>Instructions:</strong><br>
              1. Open the scanner in organizer dashboard<br>
              2. Point camera at this QR code<br>
              3. It should scan instantly ✅
            </p>
          </div>

          <div class="info-box">
            <h4>🔍 QR Code Details</h4>
            <p><strong>Format:</strong> New format (same as wallet)</p>
            <p><strong>QR String Length:</strong> ${qrResult.qr.length} characters</p>
            <p><strong>QR Prefix:</strong> ${qrResult.qr.substring(0, 50)}...</p>
            <p><strong>Expires At:</strong> ${new Date(qrResult.expiresAt).toLocaleString()}</p>
            <p><strong>Image Size:</strong> 350x350px (generated), 280x280px (displayed)</p>
            <p><strong>Error Correction:</strong> Level H (Highest)</p>
          </div>

          <div class="info-box">
            <h4>📋 Test Checklist</h4>
            <ul>
              <li>✅ QR code is large and clear</li>
              <li>✅ QR code scans instantly</li>
              <li>✅ Scanner recognizes the format</li>
              <li>✅ Ticket verification succeeds</li>
            </ul>
          </div>

          <div class="footer">
            <p>This is a test email sent via Ethereal</p>
            <p>View this email at: <a href="https://ethereal.email">https://ethereal.email</a></p>
            <p>Ticket ID: ${testTicket._id}</p>
          </div>
        </body>
        </html>
      `,
      attachments: [{
        filename: `qr-${testTicket.ticketNumber}.${imageType}`,
        content: imageBuffer,
        contentType: `image/${imageType}`,
        cid: 'qr-code' // Content-ID for inline embedding
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('✅ Test email sent successfully!');
    console.log('\n📧 Email Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   Preview URL:', previewUrl);
    console.log('\n🔍 Next Steps:');
    console.log('   1. Open the preview URL above in your browser');
    console.log('   2. You will see the email with the QR code');
    console.log('   3. Open the scanner in organizer dashboard');
    console.log('   4. Point camera at the QR code in the email');
    console.log('   5. It should scan instantly! ✅');
    console.log('\n📊 Test Summary:');
    console.log('   Ticket Number:', testTicket.ticketNumber);
    console.log('   Ticket ID:', testTicket._id.toString());
    console.log('   QR Format: New format (same as wallet)');
    console.log('   QR Image Size: 350x350px (generated), 280x280px (displayed)');
    console.log('   QR Error Correction: Level H (Highest)');
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

