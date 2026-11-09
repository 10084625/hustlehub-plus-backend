const { Transaction } = require('../models/Transaction');

const PARTY_FIELDS = 'username';

/**
 * GET /api/transactions/mine - the logged-in user's own transactions.
 * Clients see what they paid; freelancers see what they earned.
 */
const listMyTransactions = async (req, res, next) => {
  try {
    const filter = req.user.role === 'freelancer' ? { freelancer: req.user.id } : { client: req.user.id };
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('client', PARTY_FIELDS)
      .populate('freelancer', PARTY_FIELDS)
      .populate('booking', 'gigTitle status');
    return res.status(200).json({ success: true, message: 'Transactions retrieved successfully.', data: { transactions } });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/transactions - admin only.
 */
const listAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('client', PARTY_FIELDS)
      .populate('freelancer', PARTY_FIELDS)
      .populate('booking', 'gigTitle status');
    return res.status(200).json({ success: true, message: 'All transactions retrieved successfully.', data: { transactions } });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listMyTransactions, listAllTransactions };