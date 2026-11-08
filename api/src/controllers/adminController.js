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
