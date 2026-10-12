const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/generateToken');
const { User } = require('../models/User');

const NOT_AUTHORISED = 'Not authorised. Please log in to access this resource.';

/**
 * protect - must run in front of every protected route.
 *
 *   1. Requires an "Authorization: Bearer <token>" header.
 *   2. Verifies signature, expiry, algorithm (HS256 only), issuer and audience.
 *   3. Loads the user from the database so that a deleted or deactivated
 *      account loses access immediately, and so the role used for RBAC comes
 *      from the database rather than only from the token.
 *   4. Attaches a minimal user object to req.user.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(NOT_AUTHORISED, 401));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return next(new AppError(NOT_AUTHORISED, 401));

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again.' : NOT_AUTHORISED;
    return next(new AppError(message, 401));
  }

  try {
    if (!mongoose.isValidObjectId(decoded.sub)) return next(new AppError(NOT_AUTHORISED, 401));
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return next(new AppError(NOT_AUTHORISED, 401));

    req.user = { id: user._id.toString(), role: user.role, email: user.email, username: user.username };
    return next();
  } catch (err) {
    return next(err);
  }
};

