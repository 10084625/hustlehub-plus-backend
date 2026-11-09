// References: [3] RFC 7519 JWT, [12] jsonwebtoken (token verification),
// [20] OWASP Authorization Cheat Sheet (deny by default, role checks),
// [21] OWASP Session Management Cheat Sheet (server-side logout).
// README section 22 (References).
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/generateToken');
const { User } = require('../models/User');
const { RevokedToken } = require('../models/RevokedToken');
const { logEvent } = require('../utils/audit');

const NOT_AUTHORISED = 'Not authorised. Please log in to access this resource.';

/**
 * protect - must run in front of every protected route.
 *
 *   1. Requires an "Authorization: Bearer <token>" header.
 *   2. Verifies signature, expiry, algorithm (HS256 only), issuer and audience.
 *   3. Loads the user from the database so that a deleted or deactivated
 *      account loses access immediately, and so the role used for RBAC comes
 *      from the database rather than only from the token.
 *   4. Part 3: refuses tokens that were signed out (jti on the deny-list) or
 *      that are older than the user's current tokenVersion ("sign out
 *      everywhere" or an admin suspension).
 *   5. Attaches a minimal user object to req.user, and the token's id and
 *      expiry to req.auth (used by logout).
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(NOT_AUTHORISED, 401));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return next(new AppError(NOT_AUTHORISED, 401));

  const reject = (reason, message = NOT_AUTHORISED, userId = undefined) => {
    logEvent('warn', 'auth.token.rejected', req, { reason }, { userId });
    return next(new AppError(message, 401));
  };

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reject('expired', 'Your session has expired. Please log in again.');
    }
    return reject('invalid');
  }

  try {
    if (!mongoose.isValidObjectId(decoded.sub) || typeof decoded.jti !== 'string') return reject('malformed_claims');

    const [user, revoked] = await Promise.all([User.findById(decoded.sub), RevokedToken.exists({ jti: decoded.jti })]);
    if (!user) return reject('user_missing');
    if (!user.isActive) return reject('account_suspended', NOT_AUTHORISED, user.id);
    if (revoked) return reject('signed_out', 'You have signed out. Please log in again.', user.id);
    if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
      return reject('token_version', 'Your session was ended. Please log in again.', user.id);
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email, username: user.username };
    req.auth = { jti: decoded.jti, expiresAt: new Date(decoded.exp * 1000) };
    return next();
  } catch (err) {
    return next(err);
  }
};
