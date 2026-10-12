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

/**
 * GET /api/bookings/mine - client sees bookings they made; freelancer sees
 * bookings made on their gigs. The filter is built from the token's user id,
 * so there is no way to ask for someone else's bookings.
 */
const listMyBookings = async (req, res, next) => {
  try {
    const filter = req.user.role === 'freelancer' ? { freelancer: req.user.id } : { client: req.user.id };
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('client', PARTY_FIELDS)
      .populate('freelancer', PARTY_FIELDS);
    return res.status(200).json({ success: true, message: 'Bookings retrieved successfully.', data: { bookings } });
  } catch (err) {
    return next(err);
  }
};
/**
 * GET /api/bookings - admin only. Every booking on the platform.
 */
const listAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('client', PARTY_FIELDS)
      .populate('freelancer', PARTY_FIELDS);
    return res.status(200).json({ success: true, message: 'All bookings retrieved successfully.', data: { bookings } });
  } catch (err) {
    return next(err);
  }
};
/**
 * GET /api/bookings/:id - only the booking's client, its freelancer, or an admin.
 */
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.validated.params.id)
      .populate('client', PARTY_FIELDS)
      .populate('freelancer', PARTY_FIELDS);
    if (!booking || !(isOwnerOrAdmin(req.user, booking.client) || isOwnerOrAdmin(req.user, booking.freelancer))) {
      return next(notFound('Booking'));
    }
    const transaction = await Transaction.findOne({ booking: booking._id });
    return res.status(200).json({ success: true, message: 'Booking retrieved successfully.', data: { booking, transaction } });
  } catch (err) {
    return next(err);
  }
};
