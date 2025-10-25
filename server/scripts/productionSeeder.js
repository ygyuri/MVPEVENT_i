/* eslint-disable no-console */
const mongoose = require('mongoose');

const User = require('../models/User');
const EventCategory = require('../models/EventCategory');

// Production event categories seed data
const categoriesSeed = [
  { 
    name: 'Technology', 
    description: 'Tech conferences, hackathons, and innovation events', 
    color: '#3B82F6', 
    icon: 'laptop' 
  },
  { 
    name: 'Music', 
    description: 'Concerts, festivals, and live performances', 
    color: '#8B5CF6', 
    icon: 'music' 
  },
  { 
    name: 'Business', 
    description: 'Networking, conferences, and business meetups', 
    color: '#10B981', 
    icon: 'briefcase' 
  },
  { 
    name: 'Sports', 
    description: 'Sports events, tournaments, and fitness activities', 
    color: '#F59E0B', 
    icon: 'trophy' 
  },
  { 
    name: 'Arts & Culture', 
    description: 'Art exhibitions, theater, and cultural events', 
    color: '#EF4444', 
    icon: 'palette' 
  },
  { 
    name: 'Food & Drink', 
    description: 'Food festivals, wine tastings, and culinary events', 
    color: '#F97316', 
    icon: 'utensils' 
  },
  { 
    name: 'Education', 
    description: 'Workshops, seminars, and learning events', 
    color: '#06B6D4', 
    icon: 'graduation-cap' 
  },
  { 
    name: 'Health & Wellness', 
    description: 'Yoga, meditation, and wellness retreats', 
    color: '#EC4899', 
    icon: 'heart' 
  },
  { 
    name: 'Entertainment', 
    description: 'Movies, shows, and entertainment events', 
    color: '#8B5CF6', 
    icon: 'film' 
  },
  { 
    name: 'Community', 
    description: 'Local community events and gatherings', 
    color: '#10B981', 
    icon: 'users' 
  }
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Production seeder for essential data
 * Runs automatically during server startup in production
 */
async function seedProductionData() {
  try {
    console.log('🌱 [SEEDER] Starting production data seeding...');
    
    // Check if we're connected to MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ [SEEDER] MongoDB not connected, skipping seeding');
      return;
    }

    // Seed event categories
    console.log('📂 [SEEDER] Seeding event categories...');
    let categoriesCreated = 0;
    let categoriesUpdated = 0;

    for (const categoryData of categoriesSeed) {
      const slug = slugify(categoryData.name);
      
      try {
        const existingCategory = await EventCategory.findOne({ slug });
        
        if (!existingCategory) {
          // Create new category
          const newCategory = new EventCategory({
            ...categoryData,
            slug,
            isActive: true
          });
          await newCategory.save();
          categoriesCreated++;
          console.log(`✅ [SEEDER] Created category: ${categoryData.name}`);
        } else {
          // Update existing category
          existingCategory.name = categoryData.name;
          existingCategory.description = categoryData.description;
          existingCategory.color = categoryData.color;
          existingCategory.icon = categoryData.icon;
          existingCategory.isActive = true;
          await existingCategory.save();
          categoriesUpdated++;
          console.log(`🔄 [SEEDER] Updated category: ${categoryData.name}`);
        }
      } catch (error) {
        console.error(`❌ [SEEDER] Error processing category ${categoryData.name}:`, error.message);
      }
    }

    // Clean up any categories with invalid slugs
    try {
      const invalidCategories = await EventCategory.deleteMany({ 
        $or: [
          { slug: { $in: [null, ''] } },
          { slug: { $exists: false } }
        ]
      });
      
      if (invalidCategories.deletedCount > 0) {
        console.log(`🧹 [SEEDER] Cleaned up ${invalidCategories.deletedCount} invalid categories`);
      }
    } catch (error) {
      console.warn('⚠️ [SEEDER] Error cleaning up invalid categories:', error.message);
    }

    // Get final counts
    const totalCategories = await EventCategory.countDocuments();
    
    console.log('🌱 [SEEDER] Production seeding completed:');
    console.log(`   📂 Categories: ${totalCategories} total (${categoriesCreated} created, ${categoriesUpdated} updated)`);
    
    return {
      success: true,
      categories: {
        total: totalCategories,
        created: categoriesCreated,
        updated: categoriesUpdated
      }
    };

  } catch (error) {
    console.error('❌ [SEEDER] Production seeding failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if seeding is needed
 * Only run if categories are missing or incomplete
 */
async function shouldSeed() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return false;
    }

    const categoryCount = await EventCategory.countDocuments({ isActive: true });
    const expectedCategories = categoriesSeed.length;
    
    // Seed if we have fewer categories than expected
    const needsSeeding = categoryCount < expectedCategories;
    
    if (needsSeeding) {
      console.log(`🌱 [SEEDER] Seeding needed: ${categoryCount}/${expectedCategories} categories found`);
    } else {
      console.log(`✅ [SEEDER] No seeding needed: ${categoryCount} categories found`);
    }
    
    return needsSeeding;
  } catch (error) {
    console.warn('⚠️ [SEEDER] Error checking seeding status:', error.message);
    return true; // Seed if we can't determine status
  }
}

module.exports = {
  seedProductionData,
  shouldSeed,
  categoriesSeed
};
