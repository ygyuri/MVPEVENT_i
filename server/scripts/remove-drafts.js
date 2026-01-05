const mongoose = require('mongoose');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function removeDrafts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all draft events
    console.log('🔍 Finding all draft events...');
    const drafts = await Event.find({ status: 'draft' }).select('_id title organizer createdAt');
    
    if (drafts.length === 0) {
      console.log('✅ No draft events found');
      mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n📋 Found ${drafts.length} draft event(s):`);
    drafts.forEach((draft, index) => {
      console.log(`  ${index + 1}. ${draft.title || '(No title)'} (ID: ${draft._id})`);
      console.log(`     Created: ${new Date(draft.createdAt).toLocaleString()}`);
    });

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete all draft events and their related data!');
    console.log('   Related data includes: tickets, orders, updates, etc.');
    
    // For script execution, we'll proceed (you can add confirmation if needed)
    console.log('\n🗑️  Deleting drafts...\n');

    const draftIds = drafts.map(d => d._id);
    
    // Check for related data
    const ordersCount = await Order.countDocuments({ eventId: { $in: draftIds } });
    const ticketsCount = await Ticket.countDocuments({ eventId: { $in: draftIds } });
    
    if (ordersCount > 0 || ticketsCount > 0) {
      console.log(`⚠️  Found related data:`);
      console.log(`   - Orders: ${ordersCount}`);
      console.log(`   - Tickets: ${ticketsCount}`);
      console.log(`\n   These will also be deleted.\n`);
    }

    // Delete related tickets
    if (ticketsCount > 0) {
      const ticketsDeleted = await Ticket.deleteMany({ eventId: { $in: draftIds } });
      console.log(`✅ Deleted ${ticketsDeleted.deletedCount} ticket(s)`);
    }

    // Delete related orders
    if (ordersCount > 0) {
      const ordersDeleted = await Order.deleteMany({ eventId: { $in: draftIds } });
      console.log(`✅ Deleted ${ordersDeleted.deletedCount} order(s)`);
    }

    // Delete the draft events
    const eventsDeleted = await Event.deleteMany({ status: 'draft' });
    console.log(`✅ Deleted ${eventsDeleted.deletedCount} draft event(s)\n`);

    console.log('🎉 All drafts removed successfully!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeDrafts();

