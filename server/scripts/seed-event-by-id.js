/**
 * Seed Ticket Types to Specific Event by ID
 * 
 * This script adds ticket types to the event with ID: 68da292052e50b3650149c90
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Docker MongoDB requires authentication
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/event_i?authSource=admin';
    console.log(`🔗 Connecting to: ${mongoURI.replace(/password123/, '****')}`); // Hide password in logs
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.error('💡 Make sure Docker is running and MongoDB container is up');
    console.error('   Run: docker ps | grep mongodb');
    process.exit(1);
  }
};

// Main seeder function
const seedTicketTypes = async () => {
  try {
    await connectDB();

    const Event = require('../models/Event');

    // Event ID from your database
    const eventId = '68da292052e50b3650149c90';
    
    console.log(`\n🔍 Looking for event with ID: ${eventId}...`);
    
    // Find the event by ID
    const event = await Event.findById(eventId);

    if (!event) {
      console.error(`❌ Event with ID ${eventId} not found!`);
      console.log('\n💡 Listing all events in database...');
      
      const allEvents = await Event.find({}, 'title slug _id status');
      console.log(`\n📊 Found ${allEvents.length} events:`);
      allEvents.forEach((evt, idx) => {
        console.log(`   ${idx + 1}. "${evt.title}"`);
        console.log(`      - ID: ${evt._id}`);
        console.log(`      - Slug: ${evt.slug}`);
        console.log(`      - Status: ${evt.status}`);
      });
      
      process.exit(1);
    }

    console.log(`✅ Event found: "${event.title}"`);
    console.log(`   - Current ticket types: ${event.ticketTypes.length}`);
    console.log(`   - Base price: ${event.pricing.currency} ${event.pricing.price}`);

    // Add ticket types aligned with the 400 KES pricing
    event.ticketTypes = [
      {
        name: 'Early Bird',
        price: 30,
        currency: 'KES',
        quantity: 50,
        description: 'Early bird special - limited time offer at discounted price',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 5
      },
      {
        name: 'General Admission',
        price: 40,
        currency: 'KES',
        quantity: 150,
        description: 'Standard entry to the event with full access to all activities',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 10
      },
      {
        name: 'VIP Pass',
        price: 80,
        currency: 'KES',
        quantity: 50,
        description: 'Premium experience with exclusive perks, priority seating, and meet & greet access',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 5
      },
      {
        name: 'Group Package',
        price: 1500,
        currency: 'KES',
        quantity: 20,
        description: 'Package for 5 people - save money when buying together!',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 3
      }
    ];

    await event.save();

    console.log(`\n✅ Successfully added ${event.ticketTypes.length} ticket types!`);
    console.log(`\n🎫 Ticket Types:`);
    event.ticketTypes.forEach((ticket, index) => {
      console.log(`   ${index + 1}. ${ticket.name}`);
      console.log(`      - Price: ${ticket.currency} ${ticket.price.toLocaleString()}`);
      console.log(`      - Quantity: ${ticket.quantity}`);
      console.log(`      - Description: ${ticket.description}`);
    });

    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Go to: http://localhost:5173/events`);
    console.log(`   2. Find "${event.title}" event`);
    console.log(`   3. Click "Buy Tickets" button`);
    console.log(`   4. You'll see the ${event.ticketTypes.length} ticket type options`);
    console.log(`   5. Test the complete checkout flow\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding ticket types:', error);
    console.error('Full error:', error.stack);
    process.exit(1);
  }
};

// Run the script
seedTicketTypes();

