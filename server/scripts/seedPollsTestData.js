/**
 * Seeds a dedicated event, paid order + ticket for the test attendee, and sample polls
 * so you can exercise organizer create + attendee vote locally.
 *
 * Run from repo root:
 *   cd server && node scripts/seedPollsTestData.js
 *
 * Prerequisites: users from seedLocalData (organizer@test.com, customer@test.com) or any
 * organizer + customer in DB — script resolves by email.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventCategory = require("../models/EventCategory");
const User = require("../models/User");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Poll = require("../models/Poll");
const PollVote = require("../models/PollVote");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

const EVENT_SLUG = "poll-sandbox-local";

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  const organizer =
    (await User.findOne({ email: "organizer@test.com" })) ||
    (await User.findOne({ role: "organizer" }));
  const customer = await User.findOne({ email: "customer@test.com" });

  if (!organizer) {
    console.error("No organizer user found. Run: cd server && node scripts/seedLocalData.js");
    process.exit(1);
  }
  if (!customer) {
    console.error("No customer@test.com found. Run seedLocalData.js first.");
    process.exit(1);
  }

  let category = await EventCategory.findOne({ slug: "music" });
  if (!category) {
    category = await EventCategory.create({
      name: "Music",
      slug: "music",
      description: "Test",
      color: "#8B5CF6",
      icon: "music",
      isActive: true,
    });
    console.log("Created fallback EventCategory: music");
  }

  let event = await Event.findOne({ slug: EVENT_SLUG });
  if (!event) {
    event = await Event.create({
      organizer: organizer._id,
      title: "Poll sandbox (local testing)",
      slug: EVENT_SLUG,
      description:
        "Local-only event for testing polls. Attendee: customer@test.com. Organizer: organizer@test.com.",
      shortDescription: "Poll QA event",
      category: category._id,
      status: "published",
      location: {
        venueName: "Test Venue",
        address: "1 Test St",
        city: "Nairobi",
        state: "Nairobi County",
        country: "Kenya",
        postalCode: "00100",
      },
      dates: {
        startDate: daysFromNow(7),
        endDate: daysFromNow(8),
        timezone: "Africa/Nairobi",
      },
      capacity: 500,
      currentAttendees: 0,
      pricing: { isFree: true },
      ticketTypes: [
        {
          name: "General",
          price: 0,
          currency: "KES",
          quantity: 500,
          description: "Free test ticket",
          minPerOrder: 1,
          maxPerOrder: 5,
        },
      ],
      media: {
        coverImageUrl:
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
        galleryUrls: [],
      },
    });
    console.log("Created event:", event.title, `(${event._id})`);
  } else {
    console.log("Using existing event:", event.title, `(${event._id})`);
  }

  let order = await Order.findOne({
    "items.eventId": event._id,
    "customer.userId": customer._id,
    status: { $in: ["paid", "completed"] },
  });

  if (!order) {
    order = await Order.create({
      customer: {
        userId: customer._id,
        email: customer.email,
        firstName: customer.firstName || "Jane",
        lastName: customer.lastName || "Customer",
        name: `${customer.firstName || "Jane"} ${customer.lastName || "Customer"}`.trim(),
        phone: "+254712000000",
      },
      purchaseSource: "direct_checkout",
      items: [
        {
          eventId: event._id,
          eventTitle: event.title,
          ticketType: "General",
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        },
      ],
      pricing: {
        subtotal: 0,
        serviceFee: 0,
        transactionFee: 0,
        total: 0,
        currency: "KES",
      },
      totalAmount: 0,
      status: "paid",
      paymentStatus: "completed",
      payment: {
        method: "payhero",
        status: "completed",
        paidAt: new Date(),
        mpesaReceiptNumber: `SEED-${Date.now()}`,
      },
      completedAt: new Date(),
    });
    console.log("Created paid order for customer:", order.orderNumber);
  } else {
    console.log("Customer already has paid order for this event:", order.orderNumber);
  }

  let ticket = await Ticket.findOne({
    eventId: event._id,
    ownerUserId: customer._id,
  });
  if (!ticket) {
    ticket = await Ticket.create({
      orderId: order._id,
      eventId: event._id,
      ownerUserId: customer._id,
      holder: {
        firstName: customer.firstName || "Jane",
        lastName: customer.lastName || "Customer",
        name: `${customer.firstName || "Jane"} ${customer.lastName || "Customer"}`.trim(),
        email: customer.email,
        phone: "+254712000000",
      },
      ticketType: "General",
      price: 0,
      status: "active",
      metadata: {
        purchaseDate: new Date(),
        validFrom: event.dates?.startDate,
        validUntil: event.dates?.endDate,
      },
    });
    console.log("Created ticket for customer");
  } else {
    console.log("Ticket already exists for customer on this event");
  }

  const closesAt = daysFromNow(30);
  const existingPolls = await Poll.countDocuments({
    event: event._id,
    deletedAt: null,
    status: "active",
  });

  if (existingPolls >= 2) {
    console.log(
      `\nEvent already has ${existingPolls} active poll(s). Skipping poll creation (max 5 per event).`
    );
  } else {
    const artistPoll = await Poll.create({
      event: event._id,
      organizer: organizer._id,
      question: "Which headliner should we book next? (artist_selection)",
      description: "Seeded poll for local testing — pick your favorite act.",
      pollType: "artist_selection",
      options: [
        {
          id: "opt_artist_a",
          label: "DJ Nova",
          description: "Afrobeats & amapiano",
          image_url: "https://images.unsplash.com/photo-1571266028243-e4733176a586?w=600&h=400&fit=crop",
          artist_name: "DJ Nova",
          artist_genre: "Afrobeats",
        },
        {
          id: "opt_artist_b",
          label: "The Voltage Band",
          description: "Live band energy",
          image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop",
          artist_name: "The Voltage Band",
          artist_genre: "Live",
        },
      ],
      maxVotes: 1,
      allowAnonymous: false,
      showResultsBeforeVote: false,
      allow_vote_changes: true,
      closesAt,
      status: "active",
    });

    const themePoll = await Poll.create({
      event: event._id,
      organizer: organizer._id,
      question: "What vibe should the after-party have? (theme_selection)",
      description: "Seeded theme poll for category-style testing.",
      pollType: "theme_selection",
      options: [
        {
          id: "opt_theme_a",
          label: "Neon cyber lounge",
          description: "Purple & cyan lights",
          theme_color_hex: "#7C3AED",
        },
        {
          id: "opt_theme_b",
          label: "Sunset rooftop",
          description: "Warm oranges",
          theme_color_hex: "#F97316",
        },
      ],
      maxVotes: 1,
      allowAnonymous: false,
      showResultsBeforeVote: false,
      allow_vote_changes: true,
      closesAt,
      status: "active",
    });

    console.log("Created polls:", artistPoll._id.toString(), themePoll._id.toString());

    const voteExists = await PollVote.findOne({
      poll: artistPoll._id,
      user: customer._id,
    });
    if (!voteExists) {
      await PollVote.create({
        poll: artistPoll._id,
        user: customer._id,
        optionIds: [artistPoll.options[0].id],
        isAnonymous: false,
      });
      console.log("Seeded one vote on artist poll (customer@test.com → first option)");
    }
  }

  console.log("\n--- Done ---");
  console.log("Organizer: log in as organizer@test.com → Organizer → open this event → Polls");
  console.log("Attendee: log in as customer@test.com → Wallet → Polls (or open URL below)");
  console.log(`Polls URL: http://localhost:3001/events/${event._id}/polls`);
  console.log(`Checkout (free): http://localhost:3001/events/${EVENT_SLUG}/checkout`);
  console.log(
    "Optional: set DEV_SKIP_PAYMENT=true in server/.env for paid events without PayHero.\n"
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
