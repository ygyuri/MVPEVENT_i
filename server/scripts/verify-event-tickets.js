/**
 * Verification Script: Check Event and Ticket Types
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

// Verify event
const verifyEvent = async () => {
  try {
    await connectDB();

    const Event = require('../models/Event');

    console.log(`\n🔍 Searching for all events in database...\n`);

    // Find all events
    const allEvents = await Event.find({}).select('_id title slug status ticketTypes pricing').lean();

    if (allEvents.length === 0) {
      console.log('❌ No events found in database');
      process.exit(1);
    }

    console.log(`📊 Found ${allEvents.length} events:\n`);

    allEvents.forEach((event, index) => {
      console.log(`${index + 1}. "${event.title}"`);
      console.log(`   - ID: ${event._id}`);
      console.log(`   - Slug: ${event.slug}`);
      console.log(`   - Status: ${event.status}`);
      console.log(`   - Is Free: ${event.pricing?.isFree}`);
      console.log(`   - Base Price: ${event.pricing?.currency || 'N/A'} ${event.pricing?.price || 0}`);
      console.log(`   - Ticket Types: ${event.ticketTypes?.length || 0}`);
      
      if (event.ticketTypes && event.ticketTypes.length > 0) {
        event.ticketTypes.forEach((ticket, i) => {
          console.log(`      ${i + 1}. ${ticket.name} - ${ticket.currency} ${ticket.price} (Qty: ${ticket.quantity})`);
        });
      }
      console.log('');
    });

    // Specifically check for TechCrunch Disrupt
    console.log(`\n🎯 Checking TechCrunch Disrupt 2024...`);
    const techCrunch = allEvents.find(e => e.slug === 'techcrunch-disrupt-2024');
    
    if (techCrunch) {
      console.log(`✅ TechCrunch Disrupt 2024 EXISTS`);
      console.log(`   - Has ${techCrunch.ticketTypes?.length || 0} ticket types`);
      
      if (techCrunch.ticketTypes && techCrunch.ticketTypes.length > 0) {
        console.log(`\n   ✨ Ticket Types Details:`);
        techCrunch.ticketTypes.forEach((ticket, i) => {
          console.log(`   ${i + 1}. ${ticket.name}`);
          console.log(`      Price: ${ticket.currency} ${ticket.price}`);
          console.log(`      Quantity: ${ticket.quantity}`);
          console.log(`      Description: ${ticket.description || 'N/A'}`);
        });
        console.log(`\n   🎉 Event is ready for checkout testing!`);
        console.log(`   🔗 URL: http://localhost:5173/events/techcrunch-disrupt-2024/checkout`);
      } else {
        console.log(`   ⚠️ No ticket types found - run the seeder again`);
      }
    } else {
      console.log(`❌ TechCrunch Disrupt 2024 NOT FOUND`);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error verifying event:', error);
    process.exit(1);
  }
};

// Run verification
verifyEvent();

