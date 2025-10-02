const mongoose = require('mongoose');
const { connectMongoDB } = require('../config/database');
const Event = require('../models/Event');
const User = require('../models/User');
const EventUpdate = require('../models/EventUpdate');
const EventUpdateReaction = require('../models/EventUpdateReaction');
const EventUpdateRead = require('../models/EventUpdateRead');

// Sample update content
const sampleUpdates = [
  {
    content: "🎉 Welcome everyone! The event is starting in 30 minutes. Please make your way to the main hall.",
    priority: "high",
    mediaUrls: []
  },
  {
    content: "📸 Don't forget to check out our photo booth in the lobby! Tag us in your photos with #MVPEvent2024",
    priority: "normal",
    mediaUrls: []
  },
  {
    content: "🍕 Lunch break! Food trucks are now open in the courtyard. We have pizza, burgers, and vegetarian options available.",
    priority: "normal",
    mediaUrls: []
  },
  {
    content: "⚠️ IMPORTANT: The keynote presentation has been moved to Hall B due to technical issues in Hall A. Please relocate now.",
    priority: "high",
    mediaUrls: []
  },
  {
    content: "🎁 Last call for the raffle! Submit your tickets at the registration desk before 3 PM to be eligible for prizes.",
    priority: "normal",
    mediaUrls: []
  },
  {
    content: "👥 Networking session starting now in the breakout rooms. Don't miss this opportunity to connect with fellow attendees!",
    priority: "low",
    mediaUrls: []
  },
  {
    content: "📱 Download our event app for the complete schedule and speaker bios. Available on iOS and Android.",
    priority: "normal",
    mediaUrls: []
  },
  {
    content: "🚗 Parking reminder: The parking garage closes at 10 PM. Please move your vehicles before then.",
    priority: "low",
    mediaUrls: []
  },
  {
    content: "🎤 The closing ceremony will begin in 15 minutes. Please make your way to the main stage.",
    priority: "high",
    mediaUrls: []
  },
  {
    content: "🙏 Thank you for attending! We hope you had a great time. Follow us on social media for updates on future events.",
    priority: "normal",
    mediaUrls: []
  }
];

// Sample reactions
const reactionTypes = ['like', 'love', 'clap', 'wow', 'sad'];

async function seedEventUpdates() {
  try {
    await connectMongoDB();
    console.log('🌱 Starting event updates seeding...');

    // Find the organizer user
    const organizer = await User.findOne({ email: 'organizer@example.com' });
    if (!organizer) {
      console.log('❌ Organizer user not found. Please run the main seed script first.');
      process.exit(1);
    }

    // Find events created by this organizer
    const events = await Event.find({ organizerId: organizer._id }).limit(3);
    if (events.length === 0) {
      console.log('❌ No events found for organizer. Please create events first.');
      process.exit(1);
    }

    console.log(`📅 Found ${events.length} events for seeding`);

    for (const event of events) {
      console.log(`\n🎯 Seeding updates for event: ${event.title} (${event._id})`);

      // Clear existing updates for this event
      await EventUpdate.deleteMany({ eventId: event._id });
      await EventUpdateReaction.deleteMany({ eventId: event._id });
      await EventUpdateRead.deleteMany({ eventId: event._id });

      // Create sample updates
      const updates = [];
      for (let i = 0; i < sampleUpdates.length; i++) {
        const updateData = sampleUpdates[i];
        const createdAt = new Date(Date.now() - (sampleUpdates.length - i) * 30 * 60 * 1000); // 30 minutes apart

        const update = new EventUpdate({
          eventId: event._id,
          organizerId: organizer._id,
          content: updateData.content,
          mediaUrls: updateData.mediaUrls,
          priority: updateData.priority,
          createdAt: createdAt,
          updatedAt: createdAt,
          moderation: {
            status: 'approved',
            reviewedAt: createdAt,
            reviewedBy: organizer._id
          }
        });

        await update.save();
        updates.push(update);
        console.log(`  ✅ Created update: "${updateData.content.substring(0, 50)}..."`);
      }

      // Create some sample reactions
      const attendees = await User.find({ 
        role: 'attendee',
        _id: { $ne: organizer._id }
      }).limit(5);

      for (const update of updates) {
        // Randomly add reactions
        const numReactions = Math.floor(Math.random() * 3) + 1; // 1-3 reactions per update
        const shuffledAttendees = attendees.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < numReactions && i < shuffledAttendees.length; i++) {
          const attendee = shuffledAttendees[i];
          const reactionType = reactionTypes[Math.floor(Math.random() * reactionTypes.length)];
          
          const reaction = new EventUpdateReaction({
            updateId: update._id,
            eventId: event._id,
            userId: attendee._id,
            reactionType: reactionType,
            createdAt: new Date(update.createdAt.getTime() + Math.random() * 10 * 60 * 1000) // Within 10 minutes of update
          });

          await reaction.save();
        }
      }

      // Create some read statuses
      for (const update of updates.slice(0, 5)) { // Mark first 5 updates as read by some attendees
        const numReaders = Math.floor(Math.random() * 3) + 1;
        const shuffledAttendees = attendees.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < numReaders && i < shuffledAttendees.length; i++) {
          const attendee = shuffledAttendees[i];
          
          const readStatus = new EventUpdateRead({
            updateId: update._id,
            eventId: event._id,
            userId: attendee._id,
            readAt: new Date(update.createdAt.getTime() + Math.random() * 5 * 60 * 1000) // Within 5 minutes of update
          });

          await readStatus.save();
        }
      }

      console.log(`  📊 Created ${updates.length} updates with reactions and read statuses`);
    }

    console.log('\n🎉 Event updates seeding completed successfully!');
    console.log('\n📋 Test URLs:');
    events.forEach(event => {
      console.log(`  Organizer: http://localhost:3000/organizer/events/${event._id}/updates`);
      console.log(`  Attendee:  http://localhost:3000/events/${event._id}/updates`);
    });

  } catch (error) {
    console.error('❌ Error seeding event updates:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the seeding
seedEventUpdates();
