const mongoose = require("mongoose");

const messageLogSchema = new mongoose.Schema(
  {
    communicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Communication",
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    recipientRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientRefModel",
    },
    recipientRefModel: {
      type: String,
      enum: ["Ticket", "User"],
      default: "Ticket",
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

messageLogSchema.index({ communicationId: 1, status: 1 });
messageLogSchema.index({ communicationId: 1, recipientEmail: 1 }, { unique: true });

module.exports = mongoose.model("MessageLog", messageLogSchema);
