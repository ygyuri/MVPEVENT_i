const TransactionFee = require("../models/TransactionFee");

class TransactionFeeService {
  /**
   * Calculate transaction fee for a given amount and currency
   * @param {Number} amount - The transaction subtotal amount
   * @param {String} currency - The currency code (default: 'KES')
   * @returns {Object} - { fee, feeDetails, tier }
   */
  async calculateTransactionFee(amount, currency = "KES") {
    try {
      // Validate inputs
      if (!amount || amount < 0) {
        return {
          fee: 0,
          feeDetails: null,
          tier: null,
        };
      }

      // Find active fee tiers for the currency, sorted by priority (ascending)
      const feeTiers = await TransactionFee.find({
        currency: currency.toUpperCase(),
        isActive: true,
      })
        .sort({ priority: 1, minAmount: 1 })
        .lean();

      if (!feeTiers || feeTiers.length === 0) {
        // No fee tiers configured - return zero fee
        console.log(
          `⚠️ No transaction fee tiers found for currency: ${currency}`
        );
        return {
          fee: 0,
          feeDetails: null,
          tier: null,
        };
      }

      // Find the matching tier for this amount
      let matchedTier = null;
      for (const tier of feeTiers) {
        if (
          amount >= tier.minAmount &&
          (tier.maxAmount === null || amount < tier.maxAmount)
        ) {
          matchedTier = tier;
          break;
        }
      }

      // If no tier matches, use the last tier (should have maxAmount = null for catch-all)
      if (!matchedTier) {
        // Check if there's a tier with maxAmount = null (catch-all)
        matchedTier = feeTiers.find((tier) => tier.maxAmount === null);

        if (!matchedTier) {
          // No catch-all tier - return zero fee
          console.log(
            `⚠️ No matching transaction fee tier for amount: ${amount} ${currency}`
          );
          return {
            fee: 0,
            feeDetails: null,
            tier: null,
          };
        }
      }

      // Calculate the fee
      let calculatedFee = 0;
      if (matchedTier.feeType === "fixed") {
        calculatedFee = matchedTier.fixedFee || 0;
      } else if (matchedTier.feeType === "percentage") {
        const percentageFee = amount * (matchedTier.percentageRate || 0);
        const additionalFee = matchedTier.additionalFixedFee || 0;
        calculatedFee = Math.round(percentageFee + additionalFee);
      }

      return {
        fee: calculatedFee,
        feeDetails: {
          tierId: matchedTier._id,
          tierName: matchedTier.name,
          feeType: matchedTier.feeType,
          fixedFee: matchedTier.fixedFee,
          percentageRate: matchedTier.percentageRate,
          additionalFixedFee: matchedTier.additionalFixedFee,
          amountRange: {
            min: matchedTier.minAmount,
            max: matchedTier.maxAmount,
          },
        },
        tier: matchedTier,
      };
    } catch (error) {
      console.error("❌ Error calculating transaction fee:", error);
      // Return zero fee on error to not block transactions
      return {
        fee: 0,
        feeDetails: null,
        tier: null,
        error: error.message,
      };
    }
  }

  /**
   * Get all active fee tiers for a currency
   * @param {String} currency - The currency code
   * @returns {Array} - Array of fee tiers
   */
  async getFeeTiers(currency = "KES") {
    try {
      return await TransactionFee.find({
        currency: currency.toUpperCase(),
        isActive: true,
      })
        .sort({ priority: 1, minAmount: 1 })
        .lean();
    } catch (error) {
      console.error("❌ Error fetching fee tiers:", error);
      return [];
    }
  }

  /**
   * Initialize default fee tiers if none exist
   * @returns {Promise<void>}
   */
  async initializeDefaultTiers(currency = "KES") {
    try {
      const existingTiers = await TransactionFee.countDocuments({
        currency: currency.toUpperCase(),
      });

      if (existingTiers > 0) {
        console.log(`✅ Fee tiers already exist for ${currency}`);
        return;
      }

      // Default fee structure for KES (based on official transaction fee schedule)
      const defaultTiers = [
        {
          name: "Tier 1: 1-49 KES",
          minAmount: 1,
          maxAmount: 50,
          feeType: "fixed",
          fixedFee: 0,
          currency: "KES",
          priority: 1,
          description: "No fee for transactions from 1 to 49 KES",
          isActive: true,
        },
        {
          name: "Tier 2: 50-499 KES",
          minAmount: 50,
          maxAmount: 500,
          feeType: "fixed",
          fixedFee: 6,
          currency: "KES",
          priority: 2,
          description: "6 KES fee for transactions from 50 to 499 KES",
          isActive: true,
        },
        {
          name: "Tier 3: 500-999 KES",
          minAmount: 500,
          maxAmount: 1000,
          feeType: "fixed",
          fixedFee: 10,
          currency: "KES",
          priority: 3,
          description: "10 KES fee for transactions from 500 to 999 KES",
          isActive: true,
        },
        {
          name: "Tier 4: 1,000-1,499 KES",
          minAmount: 1000,
          maxAmount: 1500,
          feeType: "fixed",
          fixedFee: 15,
          currency: "KES",
          priority: 4,
          description: "15 KES fee for transactions from 1,000 to 1,499 KES",
          isActive: true,
        },
        {
          name: "Tier 5: 1,500-2,499 KES",
          minAmount: 1500,
          maxAmount: 2500,
          feeType: "fixed",
          fixedFee: 20,
          currency: "KES",
          priority: 5,
          description: "20 KES fee for transactions from 1,500 to 2,499 KES",
          isActive: true,
        },
        {
          name: "Tier 6: 2,500-3,499 KES",
          minAmount: 2500,
          maxAmount: 3500,
          feeType: "fixed",
          fixedFee: 25,
          currency: "KES",
          priority: 6,
          description: "25 KES fee for transactions from 2,500 to 3,499 KES",
          isActive: true,
        },
        {
          name: "Tier 7: 3,500-4,999 KES",
          minAmount: 3500,
          maxAmount: 5000,
          feeType: "fixed",
          fixedFee: 30,
          currency: "KES",
          priority: 7,
          description: "30 KES fee for transactions from 3,500 to 4,999 KES",
          isActive: true,
        },
        {
          name: "Tier 8: 5,000-7,499 KES",
          minAmount: 5000,
          maxAmount: 7500,
          feeType: "fixed",
          fixedFee: 40,
          currency: "KES",
          priority: 8,
          description: "40 KES fee for transactions from 5,000 to 7,499 KES",
          isActive: true,
        },
        {
          name: "Tier 9: 7,500-9,999 KES",
          minAmount: 7500,
          maxAmount: 10000,
          feeType: "fixed",
          fixedFee: 45,
          currency: "KES",
          priority: 9,
          description: "45 KES fee for transactions from 7,500 to 9,999 KES",
          isActive: true,
        },
        {
          name: "Tier 10: 10,000-14,999 KES",
          minAmount: 10000,
          maxAmount: 15000,
          feeType: "fixed",
          fixedFee: 50,
          currency: "KES",
          priority: 10,
          description: "50 KES fee for transactions from 10,000 to 14,999 KES",
          isActive: true,
        },
        {
          name: "Tier 11: 15,000-19,999 KES",
          minAmount: 15000,
          maxAmount: 20000,
          feeType: "fixed",
          fixedFee: 55,
          currency: "KES",
          priority: 11,
          description: "55 KES fee for transactions from 15,000 to 19,999 KES",
          isActive: true,
        },
        {
          name: "Tier 12: 20,000-34,999 KES",
          minAmount: 20000,
          maxAmount: 35000,
          feeType: "fixed",
          fixedFee: 80,
          currency: "KES",
          priority: 12,
          description: "80 KES fee for transactions from 20,000 to 34,999 KES",
          isActive: true,
        },
        {
          name: "Tier 13: 35,000-49,999 KES",
          minAmount: 35000,
          maxAmount: 50000,
          feeType: "fixed",
          fixedFee: 105,
          currency: "KES",
          priority: 13,
          description: "105 KES fee for transactions from 35,000 to 49,999 KES",
          isActive: true,
        },
        {
          name: "Tier 14: 50,000-149,999 KES",
          minAmount: 50000,
          maxAmount: 150000,
          feeType: "fixed",
          fixedFee: 130,
          currency: "KES",
          priority: 14,
          description:
            "130 KES fee for transactions from 50,000 to 149,999 KES",
          isActive: true,
        },
        {
          name: "Tier 15: 150,000-249,999 KES",
          minAmount: 150000,
          maxAmount: 250000,
          feeType: "fixed",
          fixedFee: 160,
          currency: "KES",
          priority: 15,
          description:
            "160 KES fee for transactions from 150,000 to 249,999 KES",
          isActive: true,
        },
        {
          name: "Tier 16: 250,000-349,999 KES",
          minAmount: 250000,
          maxAmount: 350000,
          feeType: "fixed",
          fixedFee: 195,
          currency: "KES",
          priority: 16,
          description:
            "195 KES fee for transactions from 250,000 to 349,999 KES",
          isActive: true,
        },
        {
          name: "Tier 17: 350,000-549,999 KES",
          minAmount: 350000,
          maxAmount: 550000,
          feeType: "fixed",
          fixedFee: 230,
          currency: "KES",
          priority: 17,
          description:
            "230 KES fee for transactions from 350,000 to 549,999 KES",
          isActive: true,
        },
        {
          name: "Tier 18: 550,000-749,999 KES",
          minAmount: 550000,
          maxAmount: 750000,
          feeType: "fixed",
          fixedFee: 275,
          currency: "KES",
          priority: 18,
          description:
            "275 KES fee for transactions from 550,000 to 749,999 KES",
          isActive: true,
        },
        {
          name: "Tier 19: 750,000-999,999 KES",
          minAmount: 750000,
          maxAmount: 1000000,
          feeType: "fixed",
          fixedFee: 320,
          currency: "KES",
          priority: 19,
          description:
            "320 KES fee for transactions from 750,000 to 999,999 KES",
          isActive: true,
        },
        {
          name: "Tier 20: 1,000,000+ KES",
          minAmount: 1000000,
          maxAmount: null, // No upper limit - catch-all for amounts above 999,999
          feeType: "fixed",
          fixedFee: 320, // Using the same fee as the highest tier
          currency: "KES",
          priority: 20,
          description: "320 KES fee for transactions 1,000,000 KES and above",
          isActive: true,
        },
      ];

      await TransactionFee.insertMany(defaultTiers);
      console.log(
        `✅ Initialized ${defaultTiers.length} default fee tiers for ${currency}`
      );
    } catch (error) {
      console.error("❌ Error initializing default fee tiers:", error);
      throw error;
    }
  }
}

module.exports = new TransactionFeeService();
