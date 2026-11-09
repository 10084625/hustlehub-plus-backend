const { Transaction } = require('../models/Transaction');
const { verifyTransaction } = require('../utils/ledger');
const { estimateTax } = require('../utils/taxCalculator');
const { logEvent } = require('../utils/audit');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Loads the freelancer's own transactions and checks each signature
 * (tamper-evident ledger). Records that fail the check are left out of every
 * figure, so a changed database row can never inflate income or change the
 * tax estimate. Records from before Part 3 have no signature and are kept.
 */
const loadVerifiedTransactions = async (req) => {
  const all = await Transaction.find({ freelancer: req.user.id }).sort({ createdAt: 1 }).lean();
  const integrity = { checked: all.length, valid: 0, unsigned: 0, excluded: 0 };
  const usable = all.filter((t) => {
    const status = verifyTransaction(t);
    if (status === 'tampered') {
      integrity.excluded += 1;
      return false;
    }
    if (status === 'valid') integrity.valid += 1;
    else integrity.unsigned += 1;
    return true;
  });
  if (integrity.excluded > 0) {
    logEvent('error', 'ledger.tamper_detected', req, { scope: 'freelancer_income', excluded: integrity.excluded });
  }
  return { transactions: usable, integrity };
};

/**
 * GET /api/income/summary - freelancer only.
 *
 * Income is calculated from the freelancer's transaction records (not from
 * bookings or gigs), so the figure always matches the financial ledger.
 */
const getIncomeSummary = async (req, res, next) => {
  try {
    const { transactions, integrity } = await loadVerifiedTransactions(req);

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
        integrity,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/income/tax-estimate?ageGroup=under65|65to74|75plus - freelancer only (Part 3).
 *
 * Estimated income tax for the current South African tax year (1 March to
 * end of February), worked out from the freelancer's own verified
 * transactions. The full method is explained in utils/taxCalculator.js and
 * README section 4.4.
 */
const getTaxEstimate = async (req, res, next) => {
  try {
    const { ageGroup = 'under65' } = req.validated.query;
    const { transactions, integrity } = await loadVerifiedTransactions(req);
    const estimate = estimateTax(transactions, { ageGroup });
    return res.status(200).json({
      success: true,
      message: 'Tax estimate calculated successfully.',
      data: { ...estimate, integrity },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getIncomeSummary, getTaxEstimate };