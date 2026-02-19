const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: false,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    bodyHtml: {
      type: String,
      default: "",
    },
    recipientType: {
      type: String,
      enum: ["attendees", "custom"],
      default: "attendees",
    },
    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "recipientRefModel",
      },
    ],
    recipientRefModel: {
      type: String,
      enum: ["Ticket", "User"],
      default: "Ticket",
    },
    attachments: [
      {
        filename: { type: String, required: true },
        path: { type: String, required: true },
        contentType: { type: String, default: "application/octet-stream" },
      },
    ],
    /** Inline images (posters) shown inside the email body via <img src="cid:...">. Same path rules as attachments. */
    inlineImages: [
      {
        cid: { type: String, required: true },
        filename: { type: String, required: true },
        path: { type: String, required: true },
        contentType: { type: String, default: "image/jpeg" },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "queued", "sending", "completed", "cancelled"],
      default: "draft",
      required: true,
    },
    queuedAt: Date,
    startedAt: Date,
    completedAt: Date,
    jobId: { type: String },
  },
  { timestamps: true }
);

communicationSchema.index({ createdBy: 1, createdAt: -1 });
communicationSchema.index({ status: 1, createdAt: -1 });
communicationSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model("Communication", communicationSchema);
