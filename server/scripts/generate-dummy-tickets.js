const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function generateDummyTickets() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find event by slug
    const slug = 'test-emails-again-1';
    console.log(`🔍 Searching for event with slug: "${slug}"...`);
    
    const event = await Event.findOne({ slug });
    
    if (!event) {
      console.log(`❌ Event with slug "${slug}" not found`);
      process.exit(1);
    }

    console.log(`✅ Found event: ${event.title} (${event._id})\n`);

    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = new User({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'test123', // Will be hashed by pre-save hook
        role: 'user'
      });
      await testUser.save();
      console.log(`✅ Created test user: ${testUser.email}\n`);
    } else {
      console.log(`✅ Using existing test user: ${testUser.email}\n`);
    }

    // Create a dummy order
    console.log('📦 Creating dummy order...');
    const order = new Order({
      orderNumber: `TEST-${Date.now()}`,
      eventId: event._id,
      customer: {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        email: testUser.email,
        phone: '+1234567890'
      },
      customerEmail: testUser.email,
      customerName: `${testUser.firstName} ${testUser.lastName}`,
      status: 'completed',
      paymentStatus: 'completed',
      paymentMethod: 'test',
      totalAmount: 0,
      items: [{
        ticketType: 'General Admission',
        quantity: 1,
        price: 0
      }]
    });
    await order.save();
    console.log(`✅ Created order: ${order.orderNumber}\n`);

    // Generate tickets
    const ticketService = require('../services/ticketService');
    const QRCode = require('qrcode');

    console.log('🎫 Generating tickets with QR codes...');
    const tickets = [];
    
    for (let i = 0; i < 3; i++) {
      const ticket = new Ticket({
        orderId: order._id,
        eventId: event._id,
        ownerUserId: testUser._id,
        ticketNumber: `TEST-${Date.now()}-${i + 1}`,
        ticketType: 'General Admission',
        price: 0,
        status: 'active',
        holder: {
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          name: `${testUser.firstName} ${testUser.lastName}`,
          email: testUser.email,
          phone: '+1234567890'
        },
        orderPaid: true
      });

      // Generate QR code
      const qrResult = await ticketService.issueQr(ticket._id.toString(), {
        rotate: false
      });

      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      ticket.qrCode = qrResult.qr;
      ticket.qrCodeUrl = qrCodeDataURL;
      await ticket.save();
      tickets.push(ticket);

      console.log(`  ✅ Ticket ${i + 1}: ${ticket.ticketNumber}`);
      console.log(`     QR Code: ${ticket.qrCode.substring(0, 50)}...`);
    }

    console.log(`\n✅ Generated ${tickets.length} tickets successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Event: ${event.title}`);
    console.log(`   Order: ${order.orderNumber}`);
    console.log(`   User: ${testUser.email}`);
    console.log(`   Tickets: ${tickets.length}`);
    console.log(`\n💡 To view tickets:`);
    console.log(`   1. Login as: ${testUser.email}`);
    console.log(`   2. Password: test123`);
    console.log(`   3. Go to Ticket Wallet to see the QR codes`);
    console.log(`\n📱 To scan QR codes:`);
    console.log(`   1. Access scanner from your phone`);
    console.log(`   2. Scan the QR codes from the ticket wallet`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateDummyTickets();

