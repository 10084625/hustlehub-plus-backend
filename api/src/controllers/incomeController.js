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
