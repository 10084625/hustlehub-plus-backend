const { trusted } = require('mongoose');
const AppError = require('../utils/AppError');
const { User } = require('../models/User');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const { AuditLog } = require('../models/AuditLog');
const { verifyTransaction } = require('../utils/ledger');
const { logEvent } = require('../utils/audit');

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
 * Part 3: suspension also increases tokenVersion, so tokens issued before
 * the suspension stay dead even if the account is later reactivated.
 */
const setUserStatus = async (req, res, next) => {
  try {
    const { id } = req.validated.params;
    if (id === req.user.id) return next(new AppError('You cannot change the status of your own account.', 400));

    const user = await User.findById(id);
    if (!user) return next(new AppError('User not found.', 404));
    if (user.role === 'admin') {
      logEvent('warn', 'admin.user.status_refused', req, { target: id, reason: 'target_is_admin' });
      return next(new AppError('Admin accounts cannot be suspended here.', 403));
    }

    user.isActive = req.validated.body.isActive;
    if (!user.isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    logEvent('warn', 'admin.user.status_changed', req, { target: id, isActive: user.isActive, by: req.user.id }, { userId: id });
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
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, gigs, bookings, transactions, failedLogins24h, lockouts24h] = await Promise.all([
      User.countDocuments({}),
      Gig.countDocuments({}),
      Booking.countDocuments({}),
      Transaction.find({}).select('amount platformFee').lean(),
      AuditLog.countDocuments({ event: 'auth.login.failed', createdAt: trusted({ $gte: since }) }),
      AuditLog.countDocuments({ event: 'auth.lockout.triggered', createdAt: trusted({ $gte: since }) }),
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
        security: { failedLogins24h, lockouts24h },
      },
    });
  } catch (err) {
    return next(err);
  }
};
