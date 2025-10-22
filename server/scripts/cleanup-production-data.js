#!/usr/bin/env node

/**
 * Production Data Cleanup Script
 * 
 * This script removes all test data that was created by the removed seeder files.
 * Run this script before deploying to production to ensure a clean slate.
 * 
 * WARNING: This will permanently delete test data. Only run in production!
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.production') });

// Import models
const User = require('../models/User');
const Event = require('../models/Event');
const EventCategory = require('../models/EventCategory');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const EventUpdate = require('../models/EventUpdate');
const EventUpdateReaction = require('../models/EventUpdateReaction');
const EventUpdateRead = require('../models/EventUpdateRead');
const Reminder = require('../models/Reminder');
const ReminderTemplate = require('../models/ReminderTemplate');
const MarketingAgency = require('../models/MarketingAgency');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const EventCommissionConfig = require('../models/EventCommissionConfig');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';

async function cleanupProductionData() {
  try {
    console.log('🧹 Starting Production Data Cleanup...');
    console.log('⚠️  WARNING: This will permanently delete test data!');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Remove test events (sample events from seed.js)
    console.log('\n📅 Cleaning up test events...');
    const testEventTitles = [
      'Web3 Summit 2025',
      'AI Workshop: Build with LLMs', 
      'Summer Music Festival',
      'Startup Meetup Night',
      'Test Event for Updates',
      'test-this-end-to-end'
    ];
    
    const testEvents = await Event.find({ 
      title: { $in: testEventTitles } 
    });
    
    if (testEvents.length > 0) {
      console.log(`Found ${testEvents.length} test events to remove:`);
      testEvents.forEach(event => console.log(`  - ${event.title}`));
      
      // Remove related data first
      const eventIds = testEvents.map(e => e._id);
      
      // Remove tickets for these events
      const ticketsDeleted = await Ticket.deleteMany({ eventId: { $in: eventIds } });
      console.log(`  ✅ Removed ${ticketsDeleted.deletedCount} test tickets`);
      
      // Remove orders for these events
      const ordersDeleted = await Order.deleteMany({ 'items.eventId': { $in: eventIds } });
      console.log(`  ✅ Removed ${ordersDeleted.deletedCount} test orders`);
      
      // Remove event updates
      const updatesDeleted = await EventUpdate.deleteMany({ eventId: { $in: eventIds } });
      console.log(`  ✅ Removed ${updatesDeleted.deletedCount} test event updates`);
      
      // Remove event update reactions
      const reactionsDeleted = await EventUpdateReaction.deleteMany({ eventId: { $in: eventIds } });
      console.log(`  ✅ Removed ${reactionsDeleted.deletedCount} test reactions`);
      
      // Remove event update reads
      const readsDeleted = await EventUpdateRead.deleteMany({ eventId: { $in: eventIds } });
      console.log(`  ✅ Removed ${readsDeleted.deletedCount} test reads`);
      
      // Remove reminders for these events
      const remindersDeleted = await Reminder.deleteMany({ eventId: { $in: eventIds } });
      console.log(`  ✅ Removed ${remindersDeleted.deletedCount} test reminders`);
      
      // Finally remove the events
      const eventsDeleted = await Event.deleteMany({ _id: { $in: eventIds } });
      console.log(`  ✅ Removed ${eventsDeleted.deletedCount} test events`);
    } else {
      console.log('  ✅ No test events found');
    }

    // 2. Remove test users (from various seeders)
    console.log('\n👥 Cleaning up test users...');
    const testUserEmails = [
      'admin@eventi.com',
      'customer@example.com', 
      'attendee1@test.com',
      'attendee2@test.com',
      'attendee3@test.com',
      'john.affiliate@example.com',
      'sara.tier2@example.com'
    ];
    
    const testUsers = await User.find({ email: { $in: testUserEmails } });
    
    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} test users to remove:`);
      testUsers.forEach(user => console.log(`  - ${user.email} (${user.role})`));
      
      const userIds = testUsers.map(u => u._id);
      
      // Remove user-related data
      const userTicketsDeleted = await Ticket.deleteMany({ ownerUserId: { $in: userIds } });
      console.log(`  ✅ Removed ${userTicketsDeleted.deletedCount} user tickets`);
      
      const userOrdersDeleted = await Order.deleteMany({ 'customerInfo.userId': { $in: userIds } });
      console.log(`  ✅ Removed ${userOrdersDeleted.deletedCount} user orders`);
      
      const userRemindersDeleted = await Reminder.deleteMany({ userId: { $in: userIds } });
      console.log(`  ✅ Removed ${userRemindersDeleted.deletedCount} user reminders`);
      
      // Remove affiliate marketers
      const affiliateMarketersDeleted = await AffiliateMarketer.deleteMany({ 
        email: { $in: testUserEmails } 
      });
      console.log(`  ✅ Removed ${affiliateMarketersDeleted.deletedCount} test affiliate marketers`);
      
      // Finally remove the users
      const usersDeleted = await User.deleteMany({ _id: { $in: userIds } });
      console.log(`  ✅ Removed ${usersDeleted.deletedCount} test users`);
    } else {
      console.log('  ✅ No test users found');
    }

    // 3. Remove test affiliate data (from seedAffiliateModule.js)
    console.log('\n🤝 Cleaning up test affiliate data...');
    
    // Remove test marketing agencies
    const testAgencies = await MarketingAgency.find({ 
      $or: [
        { agency_name: 'Acme Marketing Agency' },
        { agency_name: 'Acme Sub-Affiliates' },
        { agency_email: { $regex: /@example\.com$/ } }
      ]
    });
    
    if (testAgencies.length > 0) {
      console.log(`Found ${testAgencies.length} test agencies to remove:`);
      testAgencies.forEach(agency => console.log(`  - ${agency.agency_name}`));
      
      const agencyIds = testAgencies.map(a => a._id);
      
      // Remove commission configs for these agencies
      const commissionConfigsDeleted = await EventCommissionConfig.deleteMany({ 
        primary_agency_id: { $in: agencyIds } 
      });
      console.log(`  ✅ Removed ${commissionConfigsDeleted.deletedCount} test commission configs`);
      
      // Remove the agencies
      const agenciesDeleted = await MarketingAgency.deleteMany({ _id: { $in: agencyIds } });
      console.log(`  ✅ Removed ${agenciesDeleted.deletedCount} test agencies`);
    } else {
      console.log('  ✅ No test agencies found');
    }

    // 4. Remove test reminder templates
    console.log('\n⏰ Cleaning up test reminder templates...');
    const testTemplates = await ReminderTemplate.find({ 
      name: { $in: ['24h_email', '1h_email', '30min_email'] }
    });
    
    if (testTemplates.length > 0) {
      console.log(`Found ${testTemplates.length} test reminder templates to remove:`);
      testTemplates.forEach(template => console.log(`  - ${template.name}`));
      
      const templateIds = testTemplates.map(t => t._id);
      
      // Remove reminders using these templates
      const templateRemindersDeleted = await Reminder.deleteMany({ 
        templateId: { $in: templateIds } 
      });
      console.log(`  ✅ Removed ${templateRemindersDeleted.deletedCount} template-based reminders`);
      
      // Remove the templates
      const templatesDeleted = await ReminderTemplate.deleteMany({ _id: { $in: templateIds } });
      console.log(`  ✅ Removed ${templatesDeleted.deletedCount} test templates`);
    } else {
      console.log('  ✅ No test reminder templates found');
    }

    // 5. Clean up any orphaned data
    console.log('\n🔍 Cleaning up orphaned data...');
    
    // Remove tickets without valid events
    const orphanedTickets = await Ticket.deleteMany({ 
      eventId: { $nin: (await Event.find({}, '_id')).map(e => e._id) }
    });
    console.log(`  ✅ Removed ${orphanedTickets.deletedCount} orphaned tickets`);
    
    // Remove orders without valid events
    const orphanedOrders = await Order.deleteMany({ 
      'items.eventId': { $nin: (await Event.find({}, '_id')).map(e => e._id) }
    });
    console.log(`  ✅ Removed ${orphanedOrders.deletedCount} orphaned orders`);
    
    // Remove reminders without valid events
    const orphanedReminders = await Reminder.deleteMany({ 
      eventId: { $nin: (await Event.find({}, '_id')).map(e => e._id) }
    });
    console.log(`  ✅ Removed ${orphanedReminders.deletedCount} orphaned reminders`);

    // 6. Final counts
    console.log('\n📊 Final Production Data Counts:');
    const finalCounts = {
      users: await User.countDocuments(),
      events: await Event.countDocuments(),
      categories: await EventCategory.countDocuments(),
      tickets: await Ticket.countDocuments(),
      orders: await Order.countDocuments(),
      reminders: await Reminder.countDocuments(),
      agencies: await MarketingAgency.countDocuments(),
      affiliates: await AffiliateMarketer.countDocuments(),
      commissionConfigs: await EventCommissionConfig.countDocuments()
    };
    
    Object.entries(finalCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });

    console.log('\n✅ Production data cleanup completed successfully!');
    console.log('🎉 Your production database is now clean and ready for real users.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Safety check - only run in production
if (process.env.NODE_ENV !== 'production') {
  console.error('❌ This script should only be run in production!');
  console.error('   Set NODE_ENV=production and ensure you have a backup.');
  process.exit(1);
}

// Confirmation prompt
console.log('⚠️  PRODUCTION DATA CLEANUP');
console.log('========================');
console.log('This will permanently delete all test data from your production database.');
console.log('Make sure you have a backup before proceeding!');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...');

setTimeout(() => {
  cleanupProductionData();
}, 10000);
