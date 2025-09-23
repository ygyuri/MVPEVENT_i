const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Ticket identification
  ticketNumber: {
    type: String,
    required: false
  },
  
  // Associated order
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Event details
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  
  // Owner user (denormalized for quick lookups)
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Ticket holder information
  holder: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Ticket details
  ticketType: {
    type: String,
    required: true
  },
  
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Ticket status
  status: {
    type: String,
    enum: ['active', 'used', 'cancelled', 'refunded'],
    default: 'active'
  },
  
  // QR code for validation
  qrCode: {
    type: String
  },
  
  // Secure QR payload meta (for signature + replay/expiry checks)
  qr: {
    nonce: { type: String },
    issuedAt: { type: Date },
    expiresAt: { type: Date },
    signature: { type: String }
  },
  
  // Usage tracking
  usedAt: Date,
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Event staff who scanned the ticket
  },
  
  // Scan attempts history (optional audit)
  scanHistory: [
    {
      scannedAt: { type: Date },
      scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      location: { type: String },
      result: { type: String, enum: ['success', 'already_used', 'invalid', 'expired', 'denied'] }
    }
  ],
  
  // Metadata
  metadata: {
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    validFrom: Date,
    validUntil: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ qrCode: 1 });
ticketSchema.index({ 'holder.email': 1 });
ticketSchema.index({ 'holder.email': 1, eventId: 1 });
ticketSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ 'qr.nonce': 1 });

// Pre-validate to generate ticket number and QR code meta
ticketSchema.pre('validate', function(next) {
  if (!this.ticketNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.ticketNumber = `TKT-${timestamp}-${random}`;
  }
  
  if (!this.qrCode) {
    this.qrCode = `QR-${this.ticketNumber}-${Date.now()}`;
  }
  
  next();
});

// Virtual for holder full name
ticketSchema.virtual('holder.fullName').get(function() {
  return `${this.holder.firstName} ${this.holder.lastName}`;
});

// Virtual for ticket validity
ticketSchema.virtual('isValid').get(function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  if (this.metadata.validFrom && now < this.metadata.validFrom) return false;
  if (this.metadata.validUntil && now > this.metadata.validUntil) return false;
  
  return true;
});

// JSON serialization
ticketSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);
