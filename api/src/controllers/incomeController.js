const { Transaction } = require('../models/Transaction');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * GET /api/income/summary - freelancer only.
 *
 * Income is calculated from the freelancer's transaction records (not from
 * bookings or gigs), so the figure always matches the financial ledger.
 * Totals are worked out in JavaScript from the freelancer's own records,
 * which keeps the logic easy to read and test.
 */
const getIncomeSummary = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ freelancer: req.user.id }).sort({ createdAt: 1 }).lean();

    const totals = transactions.reduce(
      (acc, t) => {
        acc.grossIncome += t.amount;
        acc.platformFees += t.platformFee;
        acc.netIncome += t.freelancerEarnings;
        return acc;
      },
      { grossIncome: 0, platformFees: 0, netIncome: 0 }
    );

    const byMonthMap = new Map();
    transactions.forEach((t) => {
      const month = new Date(t.createdAt).toISOString().slice(0, 7); // "2026-10"
      const entry = byMonthMap.get(month) || { month, netIncome: 0, bookings: 0 };
      entry.netIncome += t.freelancerEarnings;
      entry.bookings += 1;
      byMonthMap.set(month, entry);
    });

    return res.status(200).json({
      success: true,
      message: 'Income summary retrieved successfully.',
      data: {
        currency: 'ZAR',
        transactionCount: transactions.length,
        grossIncome: round2(totals.grossIncome),
        platformFees: round2(totals.platformFees),
        netIncome: round2(totals.netIncome),
        averagePerBooking: transactions.length ? round2(totals.netIncome / transactions.length) : 0,
        byMonth: [...byMonthMap.values()].map((m) => ({ ...m, netIncome: round2(m.netIncome) })),
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getIncomeSummary };
