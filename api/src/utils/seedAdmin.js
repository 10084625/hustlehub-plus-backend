const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { User } = require('../models/User');

/**
 * Creates the admin account, or resets an existing one, from ADMIN_* values.
 * Admins can never sign up through the API. This function is the only way
 * to create one. It is used by "npm run seed:admin" and, in Docker, when the
 * API starts with SEED_ADMIN_ON_START=true.
 */
const ensureAdmin = async ({ username, email, password } = {}) => {
  if (!username || !email || !password || password.length < 12) {
    throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) first.');
  }
  const hash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const normalised = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalised });
  if (existing) {
    Object.assign(existing, { username, password: hash, role: 'admin', isActive: true });
    await existing.save();
    return { email: normalised, created: false };
  }
  await User.create({ username, email: normalised, password: hash, role: 'admin' });
  return { email: normalised, created: true };
};

module.exports = { ensureAdmin };