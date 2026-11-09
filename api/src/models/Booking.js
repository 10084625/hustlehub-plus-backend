const mongoose = require('mongoose');

const BOOKING_STATUSES = Object.freeze(['confirmed', 'completed']);

/**
 * A booking keeps a snapshot of the gig's title and price at the moment it
 * was booked. If the freelancer later edits or deletes the gig, the booking
 * (and the money attached to it) still reflects what the client agreed to.
 */
const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gigTitle: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'confirmed' },
  },
  { timestamps: true }
);

bookingSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Booking, BOOKING_STATUSES };
