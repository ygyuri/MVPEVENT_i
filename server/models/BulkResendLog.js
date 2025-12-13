const mongoose = require("mongoose");

const bulkResendLogSchema = new mongoose.Schema(
  {
    // Who triggered the bulk resend
    triggeredBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      userEmail: String,
      userName: String,
      role: {
        type: String,
        enum: ["admin", "organizer"],
      },
    },

    // Filters applied
    filters: {
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
      eventTitle: String,
      organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      startDate: Date,
      endDate: Date,
      skipRecentlyResent: Boolean,
      recentWindowMinutes: Number,
    },

    // Execution mode
    executionMode: {
      type: String,
      enum: ["synchronous", "queued"],
      required: true,
    },

    // Queue job ID (if queued)
    jobId: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
      default: "pending",
      required: true,
    },

    // Timing
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    duration: Number, // milliseconds

    // Results
    stats: {
      totalOrdersFound: { type: Number, default: 0 },
      totalOrdersProcessed: { type: Number, default: 0 },
      totalOrdersSkipped: { type: Number, default: 0 },
      totalTicketsUpdated: { type: Number, default: 0 },
      totalEmailsSent: { type: Number, default: 0 },
      totalEmailRetries: { type: Number, default: 0 },
      totalErrors: { type: Number, default: 0 },
    },

    // Errors
    errors: [
      {
        orderId: mongoose.Schema.Types.ObjectId,
        orderNumber: String,
        error: String,
        timestamp: Date,
      },
    ],

    // Error message (for job-level failures)
    error: String,

    // Notification sent
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
bulkResendLogSchema.index({ "triggeredBy.userId": 1, createdAt: -1 });
bulkResendLogSchema.index({ status: 1, createdAt: -1 });
bulkResendLogSchema.index({ "filters.eventId": 1, createdAt: -1 });
bulkResendLogSchema.index({ startTime: -1 });
bulkResendLogSchema.index({ executionMode: 1, status: 1 });

// Calculate duration on save
bulkResendLogSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.duration = this.endTime - this.startTime;
  }
  next();
});

// Virtual for human-readable duration
bulkResendLogSchema.virtual("durationFormatted").get(function () {
  if (!this.duration) return null;
  const seconds = Math.floor(this.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
});

// Ensure virtuals are included in JSON output
bulkResendLogSchema.set("toJSON", { virtuals: true });
bulkResendLogSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("BulkResendLog", bulkResendLogSchema);
