const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    required: true
  },
  
  // Customer information (supports both authenticated and guest users)
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Optional for guest checkout
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
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
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Order items (tickets)
  items: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    eventTitle: {
      type: String,
      required: true
    },
    ticketType: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Pricing breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    serviceFee: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'KES',
      maxlength: 3
    }
  },
  
  // MPESA payment details
  payment: {
    method: {
      type: String,
      default: 'mpesa',
      enum: ['mpesa']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    mpesaRequestId: String,
    mpesaCheckoutRequestId: String,
    mpesaMerchantRequestId: String,
    mpesaResultCode: String,
    mpesaResultDesc: String,
    mpesaTransactionId: String,
    paidAt: Date
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'paid', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customer.userId': 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ 'payment.mpesaTransactionId': 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Virtual for customer full name
orderSchema.virtual('customer.fullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    totalItems,
    totalAmount: this.pricing.total,
    currency: this.pricing.currency
  };
});

// JSON serialization
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);
