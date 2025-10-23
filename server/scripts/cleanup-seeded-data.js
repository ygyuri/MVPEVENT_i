#!/usr/bin/env node

/**
 * Seeded Data Cleanup Script
 * 
 * This script removes seeded data created by the main seed script while preserving
 * event categories. Run this during deployment to clean up test data.
 * 
 * What gets removed:
 * - Test organizer user (organizer@example.com)
 * - Any events created by the test organizer
 * - Related tickets, orders, and other data
 * 
 * What gets preserved:
 * - Event categories (Technology, Music, Business, etc.)
 * - Real user data
 * - Real events created by real users
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

// Import models
const User = require('../models/User');
const Event = require('../models/Event');
const EventCategory = require('../models/EventCategory');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const EventUpdate = require('../models/EventUpdate');
const EventUpdateReaction = require('../models/EventUpdateReaction');
const EventUpdateRead = require('../models/EventUpdateRead');
const EventStaff = require('../models/EventStaff');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';

async function cleanupSeededData() {
  try {
    console.log('🧹 Starting Seeded Data Cleanup...');
    console.log('📋 This will remove test data while preserving event categories');
    console.log('⚠️  SAFETY: Only removes specific seeded/test data, not real user data');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Safety check: Only proceed if we're in production or explicitly allowed
    if (process.env.NODE_ENV !== 'production' && !process.env.FORCE_CLEANUP) {
      console.log('⚠️  SAFETY CHECK: This script only runs in production or with FORCE_CLEANUP=true');
      console.log('   Current NODE_ENV:', process.env.NODE_ENV);
      console.log('   To force run: FORCE_CLEANUP=true node scripts/cleanup-seeded-data.js');
      return;
    }

    // 1. Find and remove ONLY the specific seeded organizer user
    console.log('\n👤 Cleaning up seeded organizer user...');
    const seededOrganizer = await User.findOne({ 
      email: 'organizer@example.com',
      username: 'organizer',
      firstName: 'Org',
      lastName: 'One'
    });
    
    if (seededOrganizer) {
      console.log(`Found seeded organizer: ${seededOrganizer.email}`);
      
      // Find all events created by this specific organizer
      const organizerEvents = await Event.find({ organizer: seededOrganizer._id });
      console.log(`Found ${organizerEvents.length} events created by seeded organizer`);
      
      if (organizerEvents.length > 0) {
        const eventIds = organizerEvents.map(e => e._id);
        
        // Additional safety: Only remove events that look like test events
        const safeToRemoveEvents = organizerEvents.filter(event => {
          const isTestEvent = 
            event.title.includes('Sample') ||
            event.title.includes('Test') ||
            event.slug.includes('test') ||
            event.slug.includes('sample') ||
            event.description?.includes('test') ||
            event.description?.includes('sample');
          
          if (!isTestEvent) {
            console.log(`  ⚠️  SKIPPING real event: ${event.title} (${event.slug})`);
            return false;
          }
          return true;
        });
        
        if (safeToRemoveEvents.length > 0) {
          const safeEventIds = safeToRemoveEvents.map(e => e._id);
          console.log(`  🎯 Removing ${safeEventIds.length} test events (skipped ${organizerEvents.length - safeEventIds.length} real events)`);
          
          // Remove related data for these safe-to-remove events
          console.log('  🎫 Removing tickets...');
          const ticketsDeleted = await Ticket.deleteMany({ eventId: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${ticketsDeleted.deletedCount} tickets`);
          
          console.log('  📦 Removing orders...');
          const ordersDeleted = await Order.deleteMany({ 'items.eventId': { $in: safeEventIds } });
          console.log(`    ✅ Removed ${ordersDeleted.deletedCount} orders`);
          
          console.log('  📢 Removing event updates...');
          const updatesDeleted = await EventUpdate.deleteMany({ eventId: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${updatesDeleted.deletedCount} event updates`);
          
          console.log('  👍 Removing event update reactions...');
          const reactionsDeleted = await EventUpdateReaction.deleteMany({ eventId: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${reactionsDeleted.deletedCount} reactions`);
          
          console.log('  👀 Removing event update reads...');
          const readsDeleted = await EventUpdateRead.deleteMany({ eventId: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${readsDeleted.deletedCount} read statuses`);
          
          console.log('  👥 Removing event staff assignments...');
          const staffDeleted = await EventStaff.deleteMany({ eventId: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${staffDeleted.deletedCount} staff assignments`);
          
          // Remove the events
          console.log('  📅 Removing events...');
          const eventsDeleted = await Event.deleteMany({ _id: { $in: safeEventIds } });
          console.log(`    ✅ Removed ${eventsDeleted.deletedCount} events`);
        }
      }
      
      // Only remove the organizer if they have no remaining events
      const remainingEvents = await Event.countDocuments({ organizer: seededOrganizer._id });
      if (remainingEvents === 0) {
        console.log('  👤 Removing seeded organizer user (no remaining events)...');
        await User.deleteOne({ _id: seededOrganizer._id });
        console.log('    ✅ Removed seeded organizer user');
      } else {
        console.log(`  ⚠️  KEEPING organizer user (${remainingEvents} real events remain)`);
      }
      
    } else {
      console.log('  ✅ No seeded organizer user found');
    }

    // 2. Remove any other test users that might have been created
    console.log('\n👥 Cleaning up other test users...');
    const testUserEmails = [
      'customer@example.com',
      'fresh@test.com',
      'attendee1@test.com',
      'attendee2@test.com',
      'attendee3@test.com'
    ];
    
    const testUsers = await User.find({ email: { $in: testUserEmails } });
    
    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} test users to remove:`);
      testUsers.forEach(user => console.log(`  - ${user.email} (${user.role})`));
      
      const userIds = testUsers.map(u => u._id);
      
      // Remove user-related data
      const userTicketsDeleted = await Ticket.deleteMany({ ownerUserId: { $in: userIds } });
      console.log(`  ✅ Removed ${userTicketsDeleted.deletedCount} user tickets`);
      
      const userOrdersDeleted = await Order.deleteMany({ 'customer.userId': { $in: userIds } });
      console.log(`  ✅ Removed ${userOrdersDeleted.deletedCount} user orders`);
      
      // Remove the users
      const usersDeleted = await User.deleteMany({ _id: { $in: userIds } });
      console.log(`  ✅ Removed ${usersDeleted.deletedCount} test users`);
    } else {
      console.log('  ✅ No other test users found');
    }

    // 3. Remove any test events that might have been created by other means
    console.log('\n📅 Cleaning up any remaining test events...');
    const testEventTitles = [
      'Sample Event',
      'Test Event for Updates',
      'Test This End to End',
      'test-this-end-to-end'
    ];
    
    const testEvents = await Event.find({ 
      $or: [
        { title: { $in: testEventTitles } },
        { slug: { $in: ['test-event-for-updates', 'test-this-end-to-end'] } }
      ]
    });
    
    if (testEvents.length > 0) {
      console.log(`Found ${testEvents.length} additional test events to remove:`);
      testEvents.forEach(event => console.log(`  - ${event.title} (${event.slug})`));
      
      const eventIds = testEvents.map(e => e._id);
      
      // Remove related data
      await Ticket.deleteMany({ eventId: { $in: eventIds } });
      await Order.deleteMany({ 'items.eventId': { $in: eventIds } });
      await EventUpdate.deleteMany({ eventId: { $in: eventIds } });
      await EventUpdateReaction.deleteMany({ eventId: { $in: eventIds } });
      await EventUpdateRead.deleteMany({ eventId: { $in: eventIds } });
      await EventStaff.deleteMany({ eventId: { $in: eventIds } });
      
      // Remove the events
      const eventsDeleted = await Event.deleteMany({ _id: { $in: eventIds } });
      console.log(`  ✅ Removed ${eventsDeleted.deletedCount} additional test events`);
    } else {
      console.log('  ✅ No additional test events found');
    }

    // 4. Clean up any orphaned data
    console.log('\n🔍 Cleaning up orphaned data...');
    
    // Remove tickets without valid events
    const validEventIds = (await Event.find({}, '_id')).map(e => e._id);
    const orphanedTickets = await Ticket.deleteMany({ 
      eventId: { $nin: validEventIds }
    });
    console.log(`  ✅ Removed ${orphanedTickets.deletedCount} orphaned tickets`);
    
    // Remove orders without valid events
    const orphanedOrders = await Order.deleteMany({ 
      'items.eventId': { $nin: validEventIds }
    });
    console.log(`  ✅ Removed ${orphanedOrders.deletedCount} orphaned orders`);

    // 5. Final counts
    console.log('\n📊 Final Database Counts:');
    const finalCounts = {
      users: await User.countDocuments(),
      events: await Event.countDocuments(),
      categories: await EventCategory.countDocuments(),
      tickets: await Ticket.countDocuments(),
      orders: await Order.countDocuments()
    };
    
    Object.entries(finalCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });

    console.log('\n✅ Seeded data cleanup completed successfully!');
    console.log('🎉 Event categories preserved, test data removed.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupSeededData();
