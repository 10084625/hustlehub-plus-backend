// References: [9] OWASP Authentication Cheat Sheet (same error message and
// equal response time for wrong email or password, account lockout),
// [10] OWASP Password Storage Cheat Sheet (bcrypt work factor), [11] bcryptjs,
// [21] OWASP Session Management Cheat Sheet (logout). See README section 22 (References).
const bcrypt = require('bcryptjs');
const { trusted } = require('mongoose');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const { generateToken } = require('../utils/generateToken');
const { User } = require('../models/User');
const { RevokedToken } = require('../models/RevokedToken');
const { AuditLog } = require('../models/AuditLog');
const lockout = require('../utils/lockout');
const { logEvent } = require('../utils/audit');

// A real bcrypt hash used when the email does not exist, so a failed login
// takes the same time whether or not the account exists (prevents timing-based
// user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-placeholder', 10);

const lockedError = (res, retryAfterSeconds) => {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  res.set('Retry-After', String(retryAfterSeconds));
  const err = new AppError(
    `Too many failed sign-in attempts. This account is locked for ${minutes} minute${minutes === 1 ? '' : 's'}. Please try again later.`,
    423
  );
  err.extra = { retryAfterSeconds };
  return err;
};

/**
 * POST /api/auth/register - Public
 * Creates a client or freelancer account. "admin" is rejected by validation.
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.validated.body;

    const existing = await User.findOne(trusted({ $or: [{ email }, { username }] })).lean();
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      logEvent('warn', 'auth.register.duplicate', req, { field });
      return next(new AppError(`An account with this ${field} already exists.`, 409));
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const user = await User.create({ username, email, password: passwordHash, role: role || 'client' });

    logEvent('info', 'auth.register.success', req, { role: user.role }, { userId: user.id });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user: user.toJSON(), token: generateToken(user) },
    });
  } catch (err) {
    return next(err);
  }
};
/**
 * POST /api/auth/login - Public
 * Same error message for "no such user", "wrong password" and "deactivated",
 * so the endpoint cannot be used to discover which emails are registered.
 * Part 3: after LOCKOUT_MAX_ATTEMPTS failures the email is locked (HTTP 423)
 * and the password is not checked until the lock expires.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const invalid = new AppError('Invalid email or password.', 401);

    const lock = await lockout.checkLock(email);
    if (lock.locked) {
      logEvent('warn', 'auth.login.blocked_locked', req, { email, retryAfterSeconds: lock.retryAfterSeconds });
      return next(lockedError(res, lock.retryAfterSeconds));
    }

    const user = await User.findOne({ email }).select('+password');
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordMatches || !user.isActive) {
      let reason = 'wrong_password';
      if (!user) reason = 'unknown_email';
      else if (passwordMatches && !user.isActive) reason = 'account_suspended';

      const result = await lockout.recordFailure(email);
      logEvent('warn', 'auth.login.failed', req, { email, reason, failedCount: result.failedCount }, { userId: user && user.id });

      if (result.lockedNow) {
        logEvent('warn', 'auth.lockout.triggered', req, { email, lockMinutes: config.lockout.lockMinutes }, { userId: user && user.id });
        return next(lockedError(res, result.retryAfterSeconds));
      }
      return next(invalid);
    }

    await lockout.clearFailures(email);
    logEvent('info', 'auth.login.success', req, {}, { userId: user.id });
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user: user.toJSON(), token: generateToken(user) },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/auth/profile - Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return res.status(200).json({ success: true, message: 'Profile retrieved successfully.', data: { user } });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/logout - Private (Part 3, own security feature 2)
 * Puts this token's id on the deny-list until the moment it would have
 * expired. The same token is refused from then on, even if it was copied.
 */
const logout = async (req, res, next) => {
  try {
    await RevokedToken.updateOne(
      { jti: req.auth.jti },
      { $setOnInsert: { jti: req.auth.jti, user: req.user.id, expiresAt: req.auth.expiresAt } },
      { upsert: true }
    );
    logEvent('info', 'auth.logout', req);
    return res.status(200).json({ success: true, message: 'You have been signed out.', data: {} });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/logout-all - Private (Part 3, own security feature 2)
 * Increases the user's tokenVersion, which makes EVERY token issued before
 * now invalid (other browsers, other devices, a stolen token).
 */
const logoutAll = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    logEvent('info', 'auth.logout_all', req);
    return res.status(200).json({ success: true, message: 'You have been signed out on every device.', data: {} });
  } catch (err) {
    return next(err);
  }
};

// Events a user is shown about their own account.
const ACTIVITY_EVENTS = [
  'auth.register.success',
  'auth.login.success',
  'auth.login.failed',
  'auth.lockout.triggered',
  'auth.logout',
  'auth.logout_all',
  'admin.user.status_changed',
];

/**
 * GET /api/auth/activity - Private (Part 3)
 * The signed-in user's recent account activity, so they can spot a sign-in
 * they do not recognise. Only the user's own entries are returned.
 */
const getActivity = async (req, res, next) => {
  try {
    const entries = await AuditLog.find({ user: req.user.id, event: trusted({ $in: ACTIVITY_EVENTS }) })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('event ip createdAt details.reason')
      .lean();
    const activity = entries.map((e) => ({
      id: e._id.toString(),
      event: e.event,
      ip: e.ip,
      at: e.createdAt,
      reason: e.details && e.details.reason,
    }));
    return res.status(200).json({ success: true, message: 'Account activity retrieved successfully.', data: { activity } });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, getProfile, logout, logoutAll, getActivity, ACTIVITY_EVENTS };