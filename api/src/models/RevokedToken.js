const mongoose = require('mongoose');

/**
 * Deny-list of signed-out tokens (Part 3, server-side logout).
 *
 * A JWT is normally valid until it expires, even after the user clicks
 * "Sign out". Each token now carries a unique id (jti). Signing out stores
 * that id here, and protect() refuses any token on this list. Entries delete
 * themselves when the token would have expired anyway (TTL index), so the
 * list never grows without limit.
 */
const revokedTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'revoked_tokens' }
);

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);

module.exports = { RevokedToken };