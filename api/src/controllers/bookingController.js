const crypto = require('crypto');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction, PLATFORM_FEE_RATE } = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { isOwnerOrAdmin, notFound } = require('../utils/ownership');

const round2 = (n) => Math.round(n * 100) / 100;

const newReference = () => `HH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const PARTY_FIELDS = 'username';

/**
 * POST /api/bookings - client only.
 *
 * 1. The gig must exist and be active.
 * 2. The price comes from the database, never from the request, so a client
 *    cannot choose what they pay.
 * 3. A booking is saved, then a transaction record (simulated payment).
 *    If the transaction fails to save, the booking is removed again so the
 *    two never get out of step.
 */
const createBooking = async (req, res, next) => {
  let booking;
  try {
    const { gigId, notes = '' } = req.validated.body;
    const gig = await Gig.findOne({ _id: gigId, isActive: true });
    if (!gig) return next(notFound('Gig'));

    if (gig.freelancer.toString() === req.user.id) {
      return next(new AppError('You cannot book your own gig.', 400));
    }

    booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      gigTitle: gig.title,
      amount: gig.price,
      notes,
    });

    const platformFee = round2(gig.price * PLATFORM_FEE_RATE);
    const transaction = await Transaction.create({
      reference: newReference(),
      booking: booking._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      amount: gig.price,
      platformFee,
      freelancerEarnings: round2(gig.price - platformFee),
    });

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed. Payment simulated successfully.',
      data: { booking, transaction },
    });
  } catch (err) {
    if (booking) await Booking.deleteOne({ _id: booking._id }).catch(() => {});
    return next(err);
  }
};
