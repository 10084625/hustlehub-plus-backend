const mongoose = require('mongoose');
const { signTransaction } = require('../utils/ledger');

// Simulated platform fee taken from each booking. The freelancer's income
// for a booking is amount - platformFee.
const PLATFORM_FEE_RATE = 0.1;

/**
 * A transaction is the financial record created for every booking.
 * Payment is simulated (no real money moves), but the record is treated as
 * immutable: there is no update or delete endpoint for transactions.
 */
const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    freelancerEarnings: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZAR' },
    paymentMethod: { type: String, default: 'simulated' },
    status: { type: String, enum: ['completed'], default: 'completed' },
    // Part 3: HMAC-SHA256 over the money fields (see utils/ledger.js)
    signature: { type: String },
  },
  { timestamps: true }
);

// Sign every new transaction, whichever code path creates it.
transactionSchema.pre('save', function signOnCreate(next) {
  if (this.isNew) this.signature = signTransaction(this);
  next();
});

transactionSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.signature;
    return ret;
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction, PLATFORM_FEE_RATE };