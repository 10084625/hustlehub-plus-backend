const AppError = require('../utils/AppError');
const { User } = require('../models/User');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction } = require('../models/Transaction');

/**
 * GET /api/admin/users - admin only.
 */
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).limit(500);
    return res.status(200).json({ success: true, message: 'Users retrieved successfully.', data: { users } });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/status - admin only. Suspend or reactivate an
 * account. A suspended user's existing tokens stop working immediately,
 * because protect() checks isActive on every request.
 */
const setUserStatus = async (req, res, next) => {
  try {
    const { id } = req.validated.params;
    if (id === req.user.id) return next(new AppError('You cannot change the status of your own account.', 400));

    const user = await User.findById(id);
    if (!user) return next(new AppError('User not found.', 404));
    if (user.role === 'admin') return next(new AppError('Admin accounts cannot be suspended here.', 403));

    user.isActive = req.validated.body.isActive;
    await user.save();
    return res.status(200).json({
      success: true,
      message: user.isActive ? 'User reactivated.' : 'User suspended.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
};
/**
 * GET /api/admin/stats - admin only. Platform-wide counts.
 */
const getStats = async (req, res, next) => {
  try {
    const [users, gigs, bookings, transactions] = await Promise.all([
      User.countDocuments({}),
      Gig.countDocuments({}),
      Booking.countDocuments({}),
      Transaction.find({}).select('amount platformFee').lean(),
    ]);
    const round2 = (n) => Math.round(n * 100) / 100;
    return res.status(200).json({
      success: true,
      message: 'Platform statistics retrieved successfully.',
      data: {
        users,
        gigs,
        bookings,
        transactions: transactions.length,
        totalVolume: round2(transactions.reduce((s, t) => s + t.amount, 0)),
        platformRevenue: round2(transactions.reduce((s, t) => s + t.platformFee, 0)),
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listUsers, setUserStatus, getStats };
