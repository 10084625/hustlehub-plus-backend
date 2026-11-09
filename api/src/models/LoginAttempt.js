const mongoose = require('mongoose');

/**
 * Failed sign-in counter used by the account lockout feature (Part 3).
 *
 * The key is a SHA-256 hash of the email that was typed, NOT a reference to
 * a user. Counting by typed email means unknown emails are locked in exactly
 * the same way as real accounts, so the lockout message cannot be used to
 * find out which emails are registered (no user enumeration).
 * Documents delete themselves through a TTL index once they are stale.
 */
const loginAttemptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    failedCount: { type: Number, default: 0, min: 0 },
    lastFailedAt: { type: Date },
    lockedUntil: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'login_attempts' }
);

loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

module.exports = { LoginAttempt };