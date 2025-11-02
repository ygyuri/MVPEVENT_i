#!/usr/bin/env node

/**
 * Initialize default transaction fee tiers
 *
 * Usage:
 *   node server/scripts/initializeTransactionFees.js [currency]
 *
 * Example:
 *   node server/scripts/initializeTransactionFees.js KES
 */

const mongoose = require("mongoose");
const transactionFeeService = require("../services/transactionFeeService");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/event_i";

const currency = process.argv[2] || "KES";

async function initializeFees() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log(`\n📊 Initializing transaction fee tiers for ${currency}...`);
    await transactionFeeService.initializeDefaultTiers(currency);

    console.log(`\n📋 Current fee tiers for ${currency}:`);
    const tiers = await transactionFeeService.getFeeTiers(currency);

    if (tiers.length === 0) {
      console.log("   No tiers found");
    } else {
      tiers.forEach((tier, index) => {
        console.log(`\n   Tier ${index + 1}: ${tier.name}`);
        console.log(
          `   Range: ${tier.minAmount} - ${tier.maxAmount ?? "∞"} ${currency}`
        );
        console.log(`   Type: ${tier.feeType}`);
        if (tier.feeType === "fixed") {
          console.log(`   Fee: ${tier.fixedFee} ${currency}`);
        } else {
          console.log(`   Rate: ${(tier.percentageRate * 100).toFixed(2)}%`);
          if (tier.additionalFixedFee > 0) {
            console.log(
              `   Additional: ${tier.additionalFixedFee} ${currency}`
            );
          }
        }
        console.log(`   Active: ${tier.isActive ? "Yes" : "No"}`);
      });
    }

    // Test calculations
    console.log("\n🧪 Testing fee calculations:");
    const testAmounts = [500, 1500, 6000, 15000];
    for (const amount of testAmounts) {
      const calc = await transactionFeeService.calculateTransactionFee(
        amount,
        currency
      );
      console.log(
        `   ${amount} ${currency} → Fee: ${calc.fee} ${currency} (${
          calc.feeDetails?.tierName || "N/A"
        })`
      );
    }

    console.log("\n✅ Transaction fee tiers initialized successfully!");

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  initializeFees();
}

module.exports = { initializeFees };
