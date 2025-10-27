const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Event = require("../models/Event");
const EventCategory = require("../models/EventCategory");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

// Helper functions
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const daysFromNow = (d) => {
  const base = new Date();
  base.setDate(base.getDate() + d);
  return base;
};

async function seedLocalData() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // ============================================
    // 1. CREATE USERS
    // ============================================
    console.log("👥 Creating test users...\n");

    // Admin user
    let admin = await User.findOne({ email: "admin@test.com" });
    if (!admin) {
      admin = new User({
        email: "admin@test.com",
        username: "admin",
        name: "Admin User",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        emailVerified: true,
        isActive: true,
      });
      await admin.setPassword("password123");
      await admin.save();
      console.log("✅ Created admin user");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // Organizer user - check if any organizer exists
    let organizer = await User.findOne({
      $or: [
        { email: "organizer@test.com" },
        { email: "organizer@example.com" },
      ],
    });

    if (!organizer) {
      // Check for any user with organizer role
      organizer = await User.findOne({ role: "organizer" });
    }

    if (!organizer) {
      organizer = new User({
        email: "organizer@test.com",
        username: "organizer",
        name: "Organizer User",
        firstName: "John",
        lastName: "Organizer",
        role: "organizer",
        emailVerified: true,
        isActive: true,
        profile: {
          phone: "+254712345678",
          city: "Nairobi",
          country: "Kenya",
        },
      });
      await organizer.setPassword("password123");
      await organizer.save();
      console.log("✅ Created organizer user");
    } else {
      console.log(`ℹ️  Using existing organizer: ${organizer.email}`);
    }

    // Customer/Attendee user
    let customer = await User.findOne({ email: "customer@test.com" });
    if (!customer) {
      customer = new User({
        email: "customer@test.com",
        username: "customer",
        name: "Customer User",
        firstName: "Jane",
        lastName: "Customer",
        role: "customer",
        emailVerified: true,
        isActive: true,
        profile: {
          phone: "+254798765432",
          city: "Mombasa",
          country: "Kenya",
        },
      });
      await customer.setPassword("password123");
      await customer.save();
      console.log("✅ Created customer user");
    } else {
      console.log("ℹ️  Customer user already exists");
    }

    // ============================================
    // 2. ENSURE CATEGORIES EXIST
    // ============================================
    console.log("\n📂 Ensuring categories exist...");
    let techCategory = await EventCategory.findOne({ slug: "technology" });
    if (!techCategory) {
      techCategory = new EventCategory({
        name: "Technology",
        slug: "technology",
        description: "Tech conferences and innovation events",
        color: "#3B82F6",
        icon: "laptop",
        isActive: true,
      });
      await techCategory.save();
      console.log("✅ Created technology category");
    }

    let musicCategory = await EventCategory.findOne({ slug: "music" });
    if (!musicCategory) {
      musicCategory = new EventCategory({
        name: "Music",
        slug: "music",
        description: "Concerts and music festivals",
        color: "#8B5CF6",
        icon: "music",
        isActive: true,
      });
      await musicCategory.save();
      console.log("✅ Created music category");
    }

    let businessCategory = await EventCategory.findOne({ slug: "business" });
    if (!businessCategory) {
      businessCategory = new EventCategory({
        name: "Business",
        slug: "business",
        description: "Business and networking events",
        color: "#10B981",
        icon: "briefcase",
        isActive: true,
      });
      await businessCategory.save();
      console.log("✅ Created business category");
    }

    // ============================================
    // 3. CREATE SAMPLE EVENTS
    // ============================================
    console.log("\n🎉 Creating sample events...\n");

    // Event 1: Tech Conference
    let techEvent = await Event.findOne({ slug: "tech-conference-2025" });
    if (!techEvent) {
      techEvent = new Event({
        organizer: organizer._id,
        title: "Tech Conference 2025",
        slug: "tech-conference-2025",
        description:
          "Join us for the biggest tech conference of the year featuring industry leaders, cutting-edge innovations, and networking opportunities with tech professionals from around the world.",
        shortDescription: "The premier tech conference of 2025",
        category: techCategory._id,
        status: "published",
        location: {
          venueName: "Kenyatta International Conference Centre",
          address: "Harambee Avenue",
          city: "Nairobi",
          state: "Nairobi County",
          country: "Kenya",
          postalCode: "00100",
        },
        dates: {
          startDate: daysFromNow(30),
          endDate: daysFromNow(31),
          timezone: "Africa/Nairobi",
        },
        capacity: 500,
        currentAttendees: 0,
        pricing: {
          isFree: false,
          price: 5000,
          currency: "KES",
        },
        flags: {
          isFeatured: true,
          isTrending: true,
        },
        media: {
          coverImageUrl:
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
          galleryUrls: [],
        },
        ticketTypes: [
          {
            name: "Early Bird",
            price: 5000,
            currency: "KES",
            quantity: 100,
            description: "Early bird pricing - limited availability",
            minPerOrder: 1,
            maxPerOrder: 5,
          },
          {
            name: "Regular",
            price: 7500,
            currency: "KES",
            quantity: 300,
            description: "Regular admission ticket",
            minPerOrder: 1,
            maxPerOrder: 10,
          },
          {
            name: "VIP",
            price: 15000,
            currency: "KES",
            quantity: 100,
            description: "VIP access with premium perks",
            minPerOrder: 1,
            maxPerOrder: 3,
          },
        ],
      });
      await techEvent.save();
      console.log("✅ Created: Tech Conference 2025");
    } else {
      console.log("ℹ️  Tech Conference 2025 already exists");
    }

    // Event 2: Music Festival
    let musicEvent = await Event.findOne({ slug: "afro-beats-festival" });
    if (!musicEvent) {
      musicEvent = new Event({
        organizer: organizer._id,
        title: "Afro Beats Music Festival",
        slug: "afro-beats-festival",
        description:
          "Experience the best of African music! A 3-day outdoor festival featuring top Afro beats artists, delicious food, and an unforgettable atmosphere.",
        shortDescription: "The hottest Afro beats festival in East Africa",
        category: musicCategory._id,
        status: "published",
        location: {
          venueName: "Uhuru Gardens",
          address: "Langata Road",
          city: "Nairobi",
          state: "Nairobi County",
          country: "Kenya",
          postalCode: "00509",
        },
        dates: {
          startDate: daysFromNow(45),
          endDate: daysFromNow(47),
          timezone: "Africa/Nairobi",
        },
        capacity: 5000,
        currentAttendees: 0,
        pricing: {
          isFree: false,
          price: 2000,
          currency: "KES",
        },
        flags: {
          isFeatured: true,
          isTrending: false,
        },
        media: {
          coverImageUrl:
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop",
          galleryUrls: [],
        },
        ticketTypes: [
          {
            name: "General Admission",
            price: 2000,
            currency: "KES",
            quantity: 4000,
            description: "General festival admission",
            minPerOrder: 1,
            maxPerOrder: 10,
          },
          {
            name: "VIP",
            price: 8000,
            currency: "KES",
            quantity: 500,
            description:
              "VIP access with exclusive viewing area and complimentary drinks",
            minPerOrder: 1,
            maxPerOrder: 5,
          },
          {
            name: "Backstage Pass",
            price: 15000,
            currency: "KES",
            quantity: 500,
            description: "Backstage access with meet & greet opportunities",
            minPerOrder: 1,
            maxPerOrder: 2,
          },
        ],
      });
      await musicEvent.save();
      console.log("✅ Created: Afro Beats Music Festival");
    } else {
      console.log("ℹ️  Afro Beats Music Festival already exists");
    }

    // Event 3: Business Networking
    let businessEvent = await Event.findOne({
      slug: "startup-networking-night",
    });
    if (!businessEvent) {
      businessEvent = new Event({
        organizer: organizer._id,
        title: "Startup Networking Night",
        slug: "startup-networking-night",
        description:
          "Connect with entrepreneurs, investors, and innovators at our monthly networking event. Free drinks and snacks included!",
        shortDescription: "Monthly startup networking event",
        category: businessCategory._id,
        status: "published",
        location: {
          venueName: "Nairobi Garage",
          address: "Forest Road",
          city: "Nairobi",
          state: "Nairobi County",
          country: "Kenya",
          postalCode: "00100",
        },
        dates: {
          startDate: daysFromNow(14),
          endDate: daysFromNow(14),
          timezone: "Africa/Nairobi",
        },
        capacity: 150,
        currentAttendees: 0,
        pricing: {
          isFree: true,
        },
        flags: {
          isFeatured: false,
          isTrending: true,
        },
        media: {
          coverImageUrl:
            "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop",
          galleryUrls: [],
        },
        ticketTypes: [
          {
            name: "Free Entry",
            price: 0,
            currency: "KES",
            quantity: 150,
            description: "Complimentary networking event",
            minPerOrder: 1,
            maxPerOrder: 5,
          },
        ],
      });
      await businessEvent.save();
      console.log("✅ Created: Startup Networking Night");
    } else {
      console.log("ℹ️  Startup Networking Night already exists");
    }

    // ============================================
    // 4. SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 LOCAL TEST DATA SEEDED SUCCESSFULLY!");
    console.log("=".repeat(60) + "\n");

    // Get fresh user data for summary
    const adminUser = await User.findOne({ email: "admin@test.com" });
    const organizerUser = await User.findOne({
      $or: [
        { email: "organizer@test.com" },
        { email: "organizer@example.com" },
      ],
    });
    const customerUser = await User.findOne({ email: "customer@test.com" });

    console.log("👥 TEST ACCOUNTS (Password: password123)");
    console.log("─".repeat(60));
    if (adminUser) console.log(`   Admin:     ${adminUser.email}`);
    if (organizerUser) console.log(`   Organizer: ${organizerUser.email}`);
    if (customerUser) console.log(`   Customer:  ${customerUser.email}`);
    console.log("");

    const eventCount = await Event.countDocuments({ status: "published" });
    console.log(`📅 SAMPLE EVENTS CREATED: ${eventCount}\n`);

    console.log("🔗 QUICK LINKS");
    console.log("─".repeat(60));
    console.log("   Client:    http://localhost:3001");
    console.log("   API:       http://localhost:5001\n");

    console.log("✨ You can now login and test the application!\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding data:", error);
    console.error("Stack:", error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedLocalData();
