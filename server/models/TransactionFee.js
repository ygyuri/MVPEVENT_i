const mongoose = require("mongoose");

/**
 * TransactionFee Model
 * Defines fee tiers based on transaction amount ranges
 *
 * Example tiers:
 * - 0-1000: 50 KES fixed
 * - 1001-5000: 100 KES fixed
 * - 5001-10000: 2% of amount
 * - 10001+: 200 KES + 1% of amount
 */
const transactionFeeSchema = new mongoose.Schema(
  {
    // Fee tier name/description
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Minimum amount (inclusive) for this tier
    minAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Maximum amount (exclusive) for this tier
    // null means no upper limit
    maxAmount: {
      type: Number,
      required: false,
      min: 0,
      default: null,
    },

    // Fee calculation type: 'fixed' or 'percentage'
    feeType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
      default: "fixed",
    },

    // Fixed fee amount (used when feeType is 'fixed')
    fixedFee: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    // Percentage fee rate (used when feeType is 'percentage')
    // Stored as decimal (e.g., 0.02 for 2%)
    percentageRate: {
      type: Number,
      required: false,
      min: 0,
      max: 1,
      default: 0,
    },

    // Additional fixed fee on top of percentage (optional)
    // Useful for: "200 KES + 1% of amount"
    additionalFixedFee: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    // Currency for this fee tier
    currency: {
      type: String,
      required: true,
      default: "KES",
      maxlength: 3,
    },

    // Status: active or inactive
    isActive: {
      type: Boolean,
      default: true,
    },

    // Priority/order for matching tiers (lower number = higher priority)
    priority: {
      type: Number,
      default: 0,
      required: true,
    },

    // Metadata
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Created/updated timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
transactionFeeSchema.index({ minAmount: 1, maxAmount: 1 });
transactionFeeSchema.index({ isActive: 1, priority: 1 });
transactionFeeSchema.index({ currency: 1, isActive: 1 });

// Pre-save middleware to update updatedAt
transactionFeeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Calculate the fee for a given amount
 * @param {Number} amount - The transaction amount
 * @returns {Number} - The calculated fee amount
 */
transactionFeeSchema.methods.calculateFee = function (amount) {
  if (this.feeType === "fixed") {
    return this.fixedFee || 0;
  } else if (this.feeType === "percentage") {
    const percentageFee = amount * (this.percentageRate || 0);
    const additionalFee = this.additionalFixedFee || 0;
    return Math.round(percentageFee + additionalFee);
  }
  return 0;
};

/**
 * Check if an amount falls within this tier's range
 * @param {Number} amount - The transaction amount
 * @returns {Boolean} - True if amount is in range
 */
transactionFeeSchema.methods.isInRange = function (amount) {
  if (amount < this.minAmount) return false;
  if (this.maxAmount !== null && amount >= this.maxAmount) return false;
  return true;
};

const TransactionFee = mongoose.model("TransactionFee", transactionFeeSchema);

module.exports = TransactionFee;
