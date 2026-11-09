// References: [16] RFC 2104 HMAC, [17] Node.js crypto (createHmac,
// timingSafeEqual). README section 22 (References).
const crypto = require('crypto');
const config = require('../config/env');

/**
 * Tamper-evident ledger (Part 3, own security feature 3).
 *
 * Every transaction record is signed with HMAC-SHA256 when it is created.
 * The signature covers the fields that matter for money: reference, the
 * booking, both people and every amount. The secret (LEDGER_HMAC_SECRET)
 * lives only in the server's environment, never in the database.
 *
 * If someone with database access (a leaked connection string, a rogue
 * insider, an injection bug) changes an amount or moves earnings to another
 * freelancer, the stored signature no longer matches. The income summary and
 * tax estimate leave such records out, and the admin integrity check lists
 * them and raises an error-level security log.
 */

const money = (n) => Number(n).toFixed(2);
const idOf = (v) => String(v && v._id ? v._id : v);

/** The exact text that is signed. Order and format are fixed on purpose. */
const canonical = (t) =>
  [
    'v1',
    t.reference,
    idOf(t.booking),
    idOf(t.client),
    idOf(t.freelancer),
    money(t.amount),
    money(t.platformFee),
    money(t.freelancerEarnings),
    t.currency,
    t.paymentMethod,
    t.status,
  ].join('|');

const signTransaction = (t, secret = config.ledger.secret) =>
  crypto.createHmac('sha256', secret).update(canonical(t)).digest('hex');

/**
 * Returns 'valid', 'tampered' or 'unsigned' (records created before Part 3).
 * Uses a constant-time comparison so the check does not leak timing.
 */
const verifyTransaction = (t, secret = config.ledger.secret) => {
  if (!t.signature) return 'unsigned';
  const expected = Buffer.from(signTransaction(t, secret), 'hex');
  const actual = Buffer.from(String(t.signature), 'hex');
  if (expected.length !== actual.length) return 'tampered';
  return crypto.timingSafeEqual(expected, actual) ? 'valid' : 'tampered';
};

module.exports = { signTransaction, verifyTransaction, canonical };