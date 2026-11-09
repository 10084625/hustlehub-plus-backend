// References: [9] OWASP Authentication Cheat Sheet ("Account lockout" and
// "Authentication and error messages"). README section 22 (References).
const crypto = require('crypto');
const config = require('../config/env');
const { LoginAttempt } = require('../models/LoginAttempt');

/**
 * Account lockout (Part 3, own security feature 1).
 *
 * Rate limiting already slows attackers down per IP address. Lockout adds a
 * per-account guard that works no matter how many IP addresses an attacker
 * uses (for example a botnet): after LOCKOUT_MAX_ATTEMPTS failed sign-ins
 * for the same email within the lock period, that email is locked for
 * LOCKOUT_MINUTES. While locked, the password is not even checked.
 *
 * No user enumeration: attempts are counted by the email that was TYPED,
 * hashed with SHA-256, whether or not an account exists. An attacker sees
 * exactly the same lockout for a made-up email as for a real one.
 *
 * Trade-off: someone who knows a user's email could lock them out on
 * purpose. The lock is short (15 minutes), lifts on its own, and a
 * successful sign-in after it expires clears the counter.
 */

const lockMs = () => config.lockout.lockMinutes * 60 * 1000;

/** Hash of the normalised email, so raw emails are not stored in this collection. */
const keyFor = (email) =>
  crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');

/** Pure helper (unit tested): seconds left on a lock, or 0 if not locked. */
const remainingLockSeconds = (lockedUntil, now = Date.now()) => {
  if (!lockedUntil) return 0;
  const ms = new Date(lockedUntil).getTime() - now;
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
};

/**
 * Pure helper (unit tested): applies one failed attempt to a counter.
 * Failures older than the lock period no longer count.
 */
const applyFailure = (state, now = Date.now(), { maxAttempts, windowMs } = {}) => {
  const max = maxAttempts || config.lockout.maxAttempts;
  const win = windowMs || lockMs();
  const stale = !state.lastFailedAt || now - new Date(state.lastFailedAt).getTime() > win;
  const failedCount = (stale ? 0 : state.failedCount || 0) + 1;
  if (failedCount >= max) {
    return { failedCount: 0, lastFailedAt: new Date(now), lockedUntil: new Date(now + win), lockedNow: true };
  }
  return { failedCount, lastFailedAt: new Date(now), lockedUntil: state.lockedUntil, lockedNow: false };
};

/** Returns { locked, retryAfterSeconds } for an email. */
const checkLock = async (email) => {
  const doc = await LoginAttempt.findOne({ key: keyFor(email) }).lean();
  const retryAfterSeconds = remainingLockSeconds(doc && doc.lockedUntil);
  return { locked: retryAfterSeconds > 0, retryAfterSeconds };
};

/** Records a failed attempt. Returns { lockedNow, retryAfterSeconds, failedCount }. */
const recordFailure = async (email, attempt = 0) => {
  const key = keyFor(email);
  const now = Date.now();
  try {
    const doc = (await LoginAttempt.findOne({ key })) || new LoginAttempt({ key });
    const next = applyFailure(doc, now);
    doc.failedCount = next.failedCount;
    doc.lastFailedAt = next.lastFailedAt;
    doc.lockedUntil = next.lockedUntil;
    doc.expiresAt = new Date(Math.max(now + lockMs(), next.lockedUntil ? new Date(next.lockedUntil).getTime() : 0));
    await doc.save();
    return {
      lockedNow: next.lockedNow,
      retryAfterSeconds: remainingLockSeconds(next.lockedUntil, now),
      failedCount: next.failedCount,
    };
  } catch (err) {
    // Two failures for the same new email at the same moment: retry once.
    if (err.code === 11000 && attempt === 0) return recordFailure(email, 1);
    throw err;
  }
};

/** A successful sign-in clears the counter. */
const clearFailures = (email) => LoginAttempt.deleteOne({ key: keyFor(email) });

module.exports = { keyFor, remainingLockSeconds, applyFailure, checkLock, recordFailure, clearFailures };