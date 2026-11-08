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
