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
  }
];

// Sample reactions
const reactionTypes = ['like', 'love', 'clap', 'wow', 'sad'];

async function createEventAndSeedUpdates() {
  try {
    await connectMongoDB();
    console.log('🌱 Starting event creation and updates seeding...');

    // Find the organizer user
    const organizer = await User.findOne({ email: 'organizer@example.com' });
    if (!organizer) {
      console.log('❌ Organizer user not found. Please run the main seed script first.');
      process.exit(1);
    }

    console.log(`👤 Found organizer: ${organizer.firstName} ${organizer.lastName} (${organizer._id})`);

    // Create a test event for the organizer
    const testEvent = new Event({
      title: "Test Event for Updates",
      slug: "test-event-for-updates",
      description: "This is a test event created specifically for testing the real-time updates feature.",
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      location: {
        venue: "Test Venue",
        address: "123 Test Street, Test City",
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      organizerId: organizer._id,
      status: "published",
      capacity: 100,
      price: 0,
      currency: "USD",
      category: "Technology",
      tags: ["test", "updates", "real-time"],
      isRecurring: false,
      recurrencePattern: null,
      mediaUrls: [],
      ticketTypes: [{
        name: "General Admission",
        price: 0,
        currency: "USD",
        quantity: 100,
        description: "Free admission for testing"
      }]
    });

    await testEvent.save();
    console.log(`✅ Created test event: ${testEvent.title} (${testEvent._id})`);

    // Clear existing updates for this event
    await EventUpdate.deleteMany({ eventId: testEvent._id });
    await EventUpdateReaction.deleteMany({ eventId: testEvent._id });
    await EventUpdateRead.deleteMany({ eventId: testEvent._id });

    // Create sample updates
    const updates = [];
    for (let i = 0; i < sampleUpdates.length; i++) {
      const updateData = sampleUpdates[i];
      const createdAt = new Date(Date.now() - (sampleUpdates.length - i) * 30 * 60 * 1000); // 30 minutes apart

      const update = new EventUpdate({
        eventId: testEvent._id,
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
    }).limit(3);

    for (const update of updates) {
      // Randomly add reactions
      const numReactions = Math.floor(Math.random() * 2) + 1; // 1-2 reactions per update
      const shuffledAttendees = attendees.sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < numReactions && i < shuffledAttendees.length; i++) {
        const attendee = shuffledAttendees[i];
        const reactionType = reactionTypes[Math.floor(Math.random() * reactionTypes.length)];
        
        const reaction = new EventUpdateReaction({
          updateId: update._id,
          eventId: testEvent._id,
          userId: attendee._id,
          reactionType: reactionType,
          createdAt: new Date(update.createdAt.getTime() + Math.random() * 10 * 60 * 1000) // Within 10 minutes of update
        });

        await reaction.save();
      }
    }

    // Create some read statuses
    for (const update of updates.slice(0, 3)) { // Mark first 3 updates as read by some attendees
      const numReaders = Math.floor(Math.random() * 2) + 1;
      const shuffledAttendees = attendees.sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < numReaders && i < shuffledAttendees.length; i++) {
        const attendee = shuffledAttendees[i];
        
        const readStatus = new EventUpdateRead({
          updateId: update._id,
          eventId: testEvent._id,
          userId: attendee._id,
          readAt: new Date(update.createdAt.getTime() + Math.random() * 5 * 60 * 1000) // Within 5 minutes of update
        });

        await readStatus.save();
      }
    }

    console.log(`\n📊 Created ${updates.length} updates with reactions and read statuses`);
    console.log('\n🎉 Event creation and updates seeding completed successfully!');
    console.log('\n📋 Test URLs:');
    console.log(`  Organizer: http://localhost:3000/organizer/events/${testEvent._id}/updates`);
    console.log(`  Attendee:  http://localhost:3000/events/${testEvent._id}/updates`);
    console.log(`\n🔑 Event ID for testing: ${testEvent._id}`);

  } catch (error) {
    console.error('❌ Error creating event and seeding updates:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the seeding
createEventAndSeedUpdates();
