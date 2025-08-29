const mongoose = require('mongoose');

const eventTagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true }
}, { timestamps: true });

eventTagSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  next()
});

module.exports = mongoose.model('EventTag', eventTagSchema);

