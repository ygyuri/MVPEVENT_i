const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    // Organizer receiving the payout
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Orders included in this payout
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    // Events included (for reference)
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    // Financial breakdown
    amounts: {
      // Total revenue from orders
      totalRevenue: {
        type: Number,
        required: true,
        min: 0,
      },
      // Service fees (platform cut)
      serviceFees: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      // Transaction fees (payment processing)
      transactionFees: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      // Total fees (service + transaction)
      totalFees: {
        type: Number,
        required: true,
        min: 0,
      },
      // Net amount paid to organizer
      netAmount: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // Payout details
    payoutNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Payment method used
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mpesa", "paypal", "manual", "other"],
      default: "manual",
    },

    // Payment reference/transaction ID
    paymentReference: {
      type: String,
      trim: true,
    },

    // Date range of orders included
    periodStart: Date,
    periodEnd: Date,

    // Completion timestamp
    completedAt: Date,

    // Admin who processed the payout
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Notes/comments
    notes: {
      type: String,
      maxlength: 1000,
    },

    // Metadata
    metadata: {
      orderCount: Number,
      eventTitles: [String],
      currency: {
        type: String,
        default: "KES",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
payoutSchema.index({ organizer: 1, createdAt: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ payoutNumber: 1 });

// Pre-save middleware to generate payout number
payoutSchema.pre("save", function (next) {
  if (!this.payoutNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.payoutNumber = `PAYOUT-${timestamp}-${random}`;
  }
  next();
});

// Method to mark as completed
payoutSchema.methods.markAsCompleted = function (adminId, reference = null) {
  this.status = "completed";
  this.completedAt = new Date();
  this.processedBy = adminId;
  if (reference) {
    this.paymentReference = reference;
  }
  return this;
};

// Method to mark as failed
payoutSchema.methods.markAsFailed = function (reason = null) {
  this.status = "failed";
  if (reason) {
    this.notes = (this.notes || "") + `\nFailed: ${reason}`;
  }
  return this;
};

// Static method to get pending payouts for organizer
payoutSchema.statics.getPendingForOrganizer = function (organizerId) {
  return this.find({ organizer: organizerId, status: "pending" })
    .populate("organizer", "email name")
    .sort({ createdAt: -1 });
};

// Static method to calculate total platform revenue
payoutSchema.statics.getTotalPlatformRevenue = async function (options = {}) {
  const query = { status: "completed" };

  if (options.startDate) {
    query.completedAt = { $gte: new Date(options.startDate) };
  }
  if (options.endDate) {
    query.completedAt = { ...query.completedAt, $lte: new Date(options.endDate) };
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amounts.totalRevenue" },
        totalFees: { $sum: "$amounts.totalFees" },
        totalPaidOut: { $sum: "$amounts.netAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    totalRevenue: 0,
    totalFees: 0,
    totalPaidOut: 0,
    count: 0,
  };
};

module.exports = mongoose.model("Payout", payoutSchema);
