const mongoose = require('mongoose');

const marketingAgencySchema = new mongoose.Schema({
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agency_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  agency_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  agency_type: {
    type: String,
    enum: ['primary', 'sub_affiliate'],
    default: 'primary'
  },
  parent_agency_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingAgency',
    default: null
  },
  contact_person: {
    type: String,
    trim: true,
    maxlength: 200
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  address: {
    type: String,
  },
  tax_id: {
    type: String,
    trim: true,
    maxlength: 50
  },
  payment_method: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'stripe', 'crypto'],
  },
  payment_details: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending_approval'],
    default: 'pending_approval'
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Unique agency email per organizer
marketingAgencySchema.index({ organizer_id: 1, agency_email: 1 }, { unique: true });
marketingAgencySchema.index({ agency_type: 1, status: 1 });
marketingAgencySchema.index({ parent_agency_id: 1 });

module.exports = mongoose.models.MarketingAgency || mongoose.model('MarketingAgency', marketingAgencySchema);


