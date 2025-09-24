const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 300
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventCategory'
  },
  location: {
    venueName: String,
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dates: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  capacity: {
    type: Number,
    min: 1
  },
  currentAttendees: {
    type: Number,
    default: 0,
    min: 0
  },
  pricing: {
    price: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3
    },
    isFree: {
      type: Boolean,
      default: false
    }
  },
  flags: {
    isFeatured: {
      type: Boolean,
      default: false
    },
    isTrending: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  media: {
    coverImageUrl: String,
    galleryUrls: [String]
  },
  ticketTypes: [{
    name: String,
    price: Number,
    quantity: Number,
    description: String
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventTag'
  }],
  // Existing metadata map
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // New: per-event QR settings (optional overrides)
  qrSettings: {
    ttlMs: { type: Number, min: 10000 },
    autoRotateMs: { type: Number, min: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance (slug already indexed by unique: true)
eventSchema.index({ title: 'text', description: 'text', 'location.city': 'text' });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ 'dates.startDate': 1 });
eventSchema.index({ 'flags.isFeatured': 1, 'dates.startDate': 1 });
eventSchema.index({ 'flags.isTrending': 1, 'dates.startDate': 1 });
eventSchema.index({ 'location.city': 1, 'location.state': 1, 'location.country': 1 });
// Added compound indexes for hot paths
eventSchema.index({ status: 1, 'dates.startDate': 1 });
eventSchema.index({ status: 1, category: 1, 'dates.startDate': 1 });
eventSchema.index({ status: 1, 'flags.isFeatured': 1, 'dates.startDate': 1 });
eventSchema.index({ status: 1, 'flags.isTrending': 1, 'dates.startDate': 1 });
eventSchema.index({ status: 1, 'pricing.isFree': 1, 'pricing.price': 1 });

// Virtual for full location
eventSchema.virtual('fullLocation').get(function() {
  const loc = this.location;
  if (!loc.city) return '';
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
});

// Virtual for price display
eventSchema.virtual('priceDisplay').get(function() {
  if (this.pricing.isFree) return 'Free';
  if (!this.pricing.price) return 'TBD';
  return `$${this.pricing.price}`;
});

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Auto-generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// JSON serialization
eventSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Event', eventSchema);
