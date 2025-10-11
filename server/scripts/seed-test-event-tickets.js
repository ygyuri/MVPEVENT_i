/**
 * Seeder Script: Add Ticket Types to Test Event
 * 
 * This script adds two ticket types to the "test this end to end" event
 * to enable testing of the direct checkout flow
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i';
    console.log(`🔗 Connecting to: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Main seeder function
const seedTicketTypes = async () => {
  try {
    await connectDB();

    const Event = require('../models/Event');

    // Event slug - the user's test event
    const eventSlug = 'test-this-end-to-end';

    console.log(`\n🔍 Looking for event with slug: ${eventSlug}...`);

    // Find the event by slug
    const event = await Event.findOne({ slug: eventSlug });

    if (!event) {
      console.error(`❌ Event not found with slug: ${eventSlug}`);
      console.log(`\n💡 Available events in database:`);
      const allEvents = await Event.find({}).select('title slug status').limit(10);
      allEvents.forEach(e => {
        console.log(`   - ${e.title} (${e.slug}) [${e.status}]`);
      });
      process.exit(1);
    }

    console.log(`✅ Found event: "${event.title}"`);
    console.log(`📊 Current ticket types: ${event.ticketTypes?.length || 0}`);

    // Define ticket types with proper pricing
    const ticketTypes = [
      {
        name: 'General Admission',
        price: 1500,
        currency: 'KES',
        quantity: 100,
        description: 'Standard entry to the event with full access to all activities',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 10
      },
      {
        name: 'VIP Pass',
        price: 3000,
        currency: 'KES',
        quantity: 30,
        description: 'Premium experience with exclusive perks, priority seating, and meet & greet access',
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: 5
      }
    ];

    console.log(`\n📝 Adding ${ticketTypes.length} ticket types...`);
    
    // Update the event with ticket types
    event.ticketTypes = ticketTypes;
    event.pricing.isFree = false; // Ensure it's marked as paid
    
    await event.save();

    console.log(`\n✅ Successfully added ticket types to event!`);
    console.log(`\n📋 Ticket Types Added:`);
    ticketTypes.forEach((ticket, index) => {
      console.log(`   ${index + 1}. ${ticket.name}`);
      console.log(`      - Price: ${ticket.currency} ${ticket.price.toLocaleString()}`);
      console.log(`      - Quantity: ${ticket.quantity}`);
      console.log(`      - Description: ${ticket.description}`);
    });

    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Go to: http://localhost:5173/events/test-this-end-to-end/checkout`);
    console.log(`   2. You should see a dropdown with 2 ticket types`);
    console.log(`   3. Changing ticket type will update the price dynamically`);
    console.log(`   4. Test the complete checkout flow\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding ticket types:', error);
    process.exit(1);
  }
};

// Run the seeder
seedTicketTypes();

