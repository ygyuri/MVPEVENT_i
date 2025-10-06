const mongoose = require('mongoose');
require('dotenv').config();

// Register models
const Event = require('../models/Event');
const MarketingAgency = require('../models/MarketingAgency');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const EventCommissionConfig = require('../models/EventCommissionConfig');

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i';
  await mongoose.connect(MONGODB_URI);

  try {
    console.log('🔰 Seeding Affiliate Module');

    // 1) Create a primary agency if none exists
    let primaryAgency = await MarketingAgency.findOne({ agency_type: 'primary', status: 'active' });
    if (!primaryAgency) {
      primaryAgency = await MarketingAgency.create({
        agency_name: 'Acme Marketing Agency',
        agency_email: 'agency+acme@example.com',
        agency_type: 'primary',
        contact_person: 'Jane Agency',
        phone: '+254700000001',
        status: 'active'
      });
      console.log('✅ Created primary agency:', primaryAgency.agency_name);
    }

    // 2) Create a sub-affiliate agency under primary (optional)
    let subAgency = await MarketingAgency.findOne({ parent_agency_id: primaryAgency._id });
    if (!subAgency) {
      subAgency = await MarketingAgency.create({
        agency_name: 'Acme Sub-Affiliates',
        agency_email: 'agency+sub@example.com',
        agency_type: 'sub_affiliate',
        parent_agency_id: primaryAgency._id,
        contact_person: 'Sam Sub',
        phone: '+254700000002',
        status: 'active'
      });
      console.log('✅ Created sub-affiliate agency:', subAgency.agency_name);
    }

    // 3) Create affiliates
    const existingAffiliate = await AffiliateMarketer.findOne({ email: 'john.affiliate@example.com' });
    if (!existingAffiliate) {
      await AffiliateMarketer.create({
        first_name: 'John',
        last_name: 'Affiliate',
        email: 'john.affiliate@example.com',
        phone: '+254700000010',
        agency_id: primaryAgency._id,
        referral_code: 'JOHN2025',
        affiliate_tier: 'tier_1',
        status: 'active'
      });
      console.log('✅ Created affiliate: John Affiliate');
    }

    const existingTier2 = await AffiliateMarketer.findOne({ email: 'sara.tier2@example.com' });
    if (!existingTier2) {
      const parent = await AffiliateMarketer.findOne({ referral_code: 'JOHN2025' });
      await AffiliateMarketer.create({
        first_name: 'Sara',
        last_name: 'TierTwo',
        email: 'sara.tier2@example.com',
        phone: '+254700000011',
        agency_id: subAgency._id,
        referral_code: 'SARA2',
        affiliate_tier: 'tier_2',
        parent_affiliate_id: parent?._id || null,
        status: 'active'
      });
      console.log('✅ Created tier-2 affiliate: Sara TierTwo');
    }

    // 4) Commission config per published event
    const events = await Event.find({ status: 'published' }).limit(5);
    for (const event of events) {
      const existingCfg = await EventCommissionConfig.findOne({ event_id: event._id });
      if (!existingCfg) {
        await EventCommissionConfig.create({
          event_id: event._id,
          organizer_id: event.organizer,
          platform_fee_type: 'percentage',
          platform_fee_percentage: 5,
          platform_fee_fixed: 0,
          platform_fee_cap: null,
          primary_agency_id: primaryAgency._id,
          primary_agency_commission_type: 'percentage',
          primary_agency_commission_rate: 40,
          affiliate_commission_enabled: true,
          affiliate_commission_type: 'percentage',
          affiliate_commission_rate: 20,
          affiliate_commission_base: 'organizer_revenue',
          enable_multi_tier: true,
          tier_2_commission_rate: 5,
          tier_3_commission_rate: null,
          attribution_model: 'last_click',
          attribution_window_days: 30,
          allow_self_referral: false,
          allow_duplicate_conversions: false,
          payout_frequency: 'weekly',
          payout_delay_days: 7,
          minimum_payout_amount: 50
        });
        console.log(`✅ Created commission config for event ${event.title}`);
      }
    }

    console.log('🎉 Affiliate module seed complete');
  } catch (e) {
    console.error('❌ Seed failed:', e);
  } finally {
    await mongoose.disconnect();
  }
}

run();


