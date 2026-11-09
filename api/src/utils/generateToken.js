// References: [3] RFC 7519 JWT, [4] RFC 8725 JWT Best Current Practices
// (pinning algorithm, issuer and audience), [12] jsonwebtoken.
// README section 22 (References).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 *Signs a JWT for an authenticated user.
 * - Payload holds only the user id ("sub") and role. A JWT is encoded, not
 *   encrypted, so nothing private goes in it.
 * - Algorithm, issuer and audience are set explicitly here and are checked
 *   explicitly in verifyToken(), so a token made by anything else is refused.
 * - Part 3: each token gets a random unique id (jti) so that it can be
 *   revoked on sign-out, and the user's tokenVersion (tv) so that "sign out
 *   everywhere" and admin suspension can cancel every older token at once.
 */
const generateToken = (user) =>
  jwt.sign({ role: user.role, tv: user.tokenVersion || 0 }, config.jwt.secret, {
    subject: String(user._id || user.id),
    jwtid: crypto.randomUUID(),
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
  /**
 * Verifies a JWT. Part 1 feedback fix: verification now pins the algorithm
 * list, issuer and audience instead of only checking the signature.
 * Throws if any check fails.
 */
const verifyToken = (token) =>
  jwt.verify(token, config.jwt.secret, {
    algorithms: [config.jwt.algorithm],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

module.exports = { generateToken, verifyToken };