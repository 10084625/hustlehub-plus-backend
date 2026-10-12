const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 *Signs a JWT for an authenticated user.
 * - Payload holds only the user id ("sub") and role. A JWT is encoded, not
 *   encrypted, so nothing private goes in it.
 * - Algorithm, issuer and audience are set explicitly here and are checked
 *   explicitly in verifyToken(), so a token made by anything else is refused.
 */
const generateToken = (user) =>
  jwt.sign({ role: user.role }, config.jwt.secret, {
    subject: String(user._id || user.id),
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
