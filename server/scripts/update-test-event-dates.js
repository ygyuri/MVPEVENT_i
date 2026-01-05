const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function updateTestEventDates() {
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
      console.log('\n📋 Available events with similar slugs:');
      const similarEvents = await Event.find({ 
        slug: { $regex: /test.*email/i } 
      }).select('slug title dates.startDate').limit(10);
      
      if (similarEvents.length > 0) {
        similarEvents.forEach(e => {
          console.log(`  - ${e.slug}: ${e.title} (${e.dates?.startDate ? new Date(e.dates.startDate).toLocaleString() : 'No date'})`);
        });
      } else {
        console.log('  No similar events found');
      }
      process.exit(1);
    }

    console.log(`✅ Found event: ${event.title}`);
    console.log(`   Current start date: ${event.dates?.startDate ? new Date(event.dates.startDate).toLocaleString() : 'Not set'}`);
    console.log(`   Current end date: ${event.dates?.endDate ? new Date(event.dates.endDate).toLocaleString() : 'Not set'}\n`);

    // Set dates to today (already started)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM today
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0); // 10 PM today

    // Make sure start date is in the past (event already started)
    if (todayStart > now) {
      todayStart.setHours(now.getHours() - 1); // Set to 1 hour ago
    }

    event.dates = {
      startDate: todayStart,
      endDate: todayEnd
    };

    await event.save();

    console.log('✅ Event dates updated:');
    console.log(`   New start date: ${new Date(event.dates.startDate).toLocaleString()}`);
    console.log(`   New end date: ${new Date(event.dates.endDate).toLocaleString()}`);
    console.log(`   Event is now: ${event.dates.startDate < now ? '✅ STARTED' : '⏳ Not started yet'}\n`);

    console.log('🎉 Event is ready for QR code testing!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateTestEventDates();

