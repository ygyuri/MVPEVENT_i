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
  tempPassword: {
    type: String,
    default: null,
    select: false // Don't include in queries by default for security
  },
  passwordResetRequired: {
    type: Boolean,
    default: false // Set to true for auto-created accounts
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
    required: function() { return this.role !== 'affiliate' && process.env.NODE_ENV !== 'test'; },
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: function() { return this.role !== 'affiliate' && process.env.NODE_ENV !== 'test'; },
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
  accountStatus: {
    type: String,
    enum: ['pending_activation', 'active', 'suspended'],
    default: 'active'
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
userSchema.index({ accountStatus: 1 }); // For filtering by account status
userSchema.index({ email: 1, accountStatus: 1 }); // For login and account status checks

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

// Temporary password methods for auto-created accounts
userSchema.methods.setTempPassword = async function(plainPassword) {
  if (!plainPassword) return;
  // Store plain text temp password (will be sent via email)
  this.tempPassword = plainPassword;
  // Also set as actual password hash
  await this.setPassword(plainPassword);
  // Mark that password reset is required
  this.passwordResetRequired = true;
  // Set account status to pending activation
  this.accountStatus = 'pending_activation';
};

userSchema.methods.clearTempPassword = function() {
  this.tempPassword = null;
  this.passwordResetRequired = false;
  if (this.accountStatus === 'pending_activation') {
    this.accountStatus = 'active';
  }
};

// JSON serialization
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash;
    delete ret.tempPassword; // Never expose temp passwords in JSON
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
