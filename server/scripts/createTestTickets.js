const mongoose = require('mongoose');
const { connectMongoDB } = require('../config/database');
const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');

async function createTestTickets() {
  try {
    await connectMongoDB();
    console.log('🎫 Creating test tickets for test-this-end-to-end event...');

    // Find the test event
    const testEvent = await Event.findOne({ slug: 'test-this-end-to-end' });
    if (!testEvent) {
      console.log('❌ Test event not found. Please run seedTestEventUpdates.js first.');
      process.exit(1);
    }

    console.log(`✅ Found test event: ${testEvent.title} (${testEvent._id})`);

    // Find or create test attendees
    const attendees = [];
    
    // Try to find existing attendees
    let existingAttendees = await User.find({ 
      role: 'attendee',
      _id: { $ne: testEvent.organizerId }
    }).limit(5);

    // If no attendees exist, create some
    if (existingAttendees.length === 0) {
      console.log('👥 No attendees found, creating test attendees...');
      
      const testAttendees = [
        { email: 'attendee1@test.com', firstName: 'Alice', lastName: 'Johnson' },
        { email: 'attendee2@test.com', firstName: 'Bob', lastName: 'Smith' },
        { email: 'attendee3@test.com', firstName: 'Carol', lastName: 'Davis' }
      ];

      for (const attendeeData of testAttendees) {
        const attendee = new User({
          email: attendeeData.email,
          username: attendeeData.email.split('@')[0],
          firstName: attendeeData.firstName,
          lastName: attendeeData.lastName,
          role: 'attendee',
          isActive: true,
          profile: {
            phone: '+1234567890'
          }
        });
        
        await attendee.save();
        attendees.push(attendee);
        console.log(`  ✅ Created attendee: ${attendee.email}`);
      }
    } else {
      attendees.push(...existingAttendees);
      console.log(`👥 Found ${existingAttendees.length} existing attendees`);
    }

    // Clear existing tickets for this event
    await Ticket.deleteMany({ eventId: testEvent._id });
    await Order.deleteMany({ 'items.eventId': testEvent._id });
    console.log('🧹 Cleared existing tickets and orders');

    // Create tickets for each attendee
    for (const attendee of attendees) {
      // Create an order
      const order = new Order({
        orderNumber: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerInfo: {
          userId: attendee._id,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          phone: attendee.profile?.phone || '+1234567890'
        },
        customer: {
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          phone: attendee.profile?.phone || '+1234567890'
        },
        items: [{
          eventId: testEvent._id,
          eventTitle: testEvent.title,
          ticketType: 'General Admission',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0
        }],
        pricing: {
          subtotal: 0,
          serviceFee: 0,
          total: 0,
          currency: 'USD'
        },
        status: 'paid',
        payment: {
          method: 'test',
          status: 'completed',
          paidAt: new Date()
        },
        createdAt: new Date()
      });

      await order.save();

      // Create ticket
      const ticket = new Ticket({
        orderId: order._id,
        eventId: testEvent._id,
        ownerUserId: attendee._id,
        holder: {
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          phone: attendee.profile?.phone || '+1234567890'
        },
        ticketType: 'General Admission',
        price: 0,
        status: 'active',
        metadata: {
          purchaseDate: new Date(),
          testTicket: true
        }
      });

      await ticket.save();
      console.log(`  ✅ Created ticket for ${attendee.email}`);
    }

    console.log(`\n🎉 Successfully created ${attendees.length} test tickets!`);
    console.log('\n📋 Test Credentials:');
    console.log('  Organizer: organizer@example.com / password123');
    console.log('  Attendees:');
    attendees.forEach(attendee => {
      console.log(`    - ${attendee.email} / password123`);
    });
    
    console.log('\n🔗 Test URLs:');
    console.log(`  Organizer: http://localhost:3000/organizer/events/test-this-end-to-end/updates`);
    console.log(`  Attendee:  http://localhost:3000/events/test-this-end-to-end/updates`);

  } catch (error) {
    console.error('❌ Error creating test tickets:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
createTestTickets();

