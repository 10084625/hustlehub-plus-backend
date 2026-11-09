const mongoose = require('mongoose');

const GIG_CATEGORIES = Object.freeze([
  'design',
  'development',
  'writing',
  'marketing',
  'video',
  'music',
  'tutoring',
  'admin-support',
  'other',
]);

const gigSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    category: { type: String, enum: GIG_CATEGORIES, required: true },
    // Stored in Rand. Validation keeps it positive with at most 2 decimals.
    price: { type: Number, required: true, min: 1, max: 1000000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 365 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

gigSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Gig = mongoose.model('Gig', gigSchema);

module.exports = { Gig, GIG_CATEGORIES };