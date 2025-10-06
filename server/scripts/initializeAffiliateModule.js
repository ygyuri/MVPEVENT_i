const mongoose = require('mongoose');
require('dotenv').config();

// Register models
require('../models/MarketingAgency');
require('../models/AffiliateMarketer');
require('../models/EventCommissionConfig');
require('../models/ReferralLink');
require('../models/ReferralClick');
require('../models/ReferralConversion');
require('../models/AffiliatePayout');
require('../models/AffiliatePerformanceCache');
require('../models/FraudDetectionLog');

const databaseIndexes = require('../services/databaseIndexes');

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i';
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  try {
    // Ensure indexes are created for affiliate module
    await databaseIndexes.createAffiliateIndexes();
    console.log('✅ Affiliate module indexes initialized');
  } catch (err) {
    console.error('❌ Failed to initialize affiliate module indexes:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});


