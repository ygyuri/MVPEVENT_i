/**
 * Create/Update Test Event with Ticket Types
 * 
 * This script creates or updates the "test this end to end" event
 * with proper ticket types for testing the checkout flow
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

// Main function
const createTestEvent = async () => {
  try {
    await connectDB();

    const Event = require('../models/Event');
    const User = require('../models/User');

    const eventSlug = 'test-this-end-to-end';
    
    console.log(`\n🔍 Looking for organizer user...`);
    
    // Find an organizer user (any organizer will work)
    let organizer = await User.findOne({ role: 'organizer' });
    
    if (!organizer) {
      console.log('⚠️ No organizer found, checking for any user...');
      organizer = await User.findOne({});
      
      if (!organizer) {
        console.error('❌ No users found in database. Please create a user first.');
        process.exit(1);
      }
      
      // Update user to organizer role
      console.log(`🔄 Updating user ${organizer.email} to organizer role...`);
      organizer.role = 'organizer';
      await organizer.save();
    }
    
    console.log(`✅ Using organizer: ${organizer.email} (ID: ${organizer._id})`);

    console.log(`\n🔍 Checking if event "${eventSlug}" exists...`);

    // Check if event exists
    let event = await Event.findOne({ slug: eventSlug });

    if (event) {
      console.log(`✅ Event found! Updating with ticket types...`);
    } else {
      console.log(`⚠️ Event not found. Creating new event...`);
      
      // Create new event
      event = new Event({
        organizer: organizer._id,
        title: 'Test This End to End',
        slug: eventSlug,
        description: 'This is a test event for end-to-end testing of the checkout flow and payment integration.',
        shortDescription: 'Test event for checkout flow',
        status: 'published',
        pricing: {
          price: 400,
          currency: 'KES',
          isFree: false
        },
        location: {
          venueName: 'Umoja Litt',
          address: 'Limuru Road',
          city: 'NAIROBI',
          state: '',
          country: 'Kenya',
          postalCode: '00900'
        },
        dates: {
          startDate: new Date('2025-10-07T09:00:00.000Z'),
          endDate: new Date('2025-10-07T13:00:00.000Z'),
          timezone: 'UTC'
        },
        capacity: 296,
        currentAttendees: 0,
        flags: {
          isFeatured: false,
          isTrending: false
        },
        media: {
          coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
          galleryUrls: []
        },
        recurrence: {
          enabled: false,
          frequency: 'weekly',
          interval: 1,
          byWeekday: [],
          byMonthday: [],
          count: null,
          until: null
        }
      });
    }

    // Add/Update ticket types
    event.ticketTypes = [
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

    // Ensure pricing is set correctly
    event.pricing.isFree = false;

    await event.save();

    console.log(`\n✅ Successfully created/updated event!`);
    console.log(`\n📋 Event Details:`);
    console.log(`   - ID: ${event._id}`);
    console.log(`   - Title: ${event.title}`);
    console.log(`   - Slug: ${event.slug}`);
    console.log(`   - Status: ${event.status}`);
    console.log(`   - Organizer: ${organizer.email}`);
    console.log(`   - Ticket Types: ${event.ticketTypes.length}`);
    
    console.log(`\n🎫 Ticket Types:`);
    event.ticketTypes.forEach((ticket, index) => {
      console.log(`   ${index + 1}. ${ticket.name}`);
      console.log(`      - Price: ${ticket.currency} ${ticket.price.toLocaleString()}`);
      console.log(`      - Quantity: ${ticket.quantity}`);
    });

    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Go to: http://localhost:5173/events`);
    console.log(`   2. Find "Test This End to End" event`);
    console.log(`   3. Click "Buy Tickets" button`);
    console.log(`   4. You'll be redirected to: http://localhost:5173/events/test-this-end-to-end/checkout`);
    console.log(`   5. Test the complete checkout flow with 2 ticket types\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating/updating event:', error);
    console.error('Full error:', error.stack);
    process.exit(1);
  }
};

// Run the script
createTestEvent();





