const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: false // Optional for Web3 users
  },
  walletAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_]+$/
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatarUrl: String,
  bio: String,
  role: {
    type: String,
    enum: ['customer', 'organizer', 'admin', 'affiliate'],
    default: 'customer'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  walletVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profile: {
    phone: String,
    city: String,
    country: String,
    preferences: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true
});

// Additional indexes for performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Password methods
userSchema.methods.setPassword = async function(password) {
  if (!password) return;
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = async function(password) {
  if (!this.passwordHash || !password) return false;
  return await bcrypt.compare(password, this.passwordHash);
};

// Check if user has password
userSchema.methods.hasPassword = function() {
  return !!this.passwordHash;
};

// JSON serialization
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
