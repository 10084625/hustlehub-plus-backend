const bcrypt = require('bcryptjs');
const { trusted } = require('mongoose');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const { generateToken } = require('../utils/generateToken');
const { User } = require('../models/User');

// A real bcrypt hash used when the email does not exist, so a failed login
// takes the same time whether or not the account exists (prevents timing-based
// user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-placeholder', 10);

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
      return next(new AppError(`An account with this ${field} already exists.`, 409));
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const user = await User.create({ username, email, password: passwordHash, role: role || 'client' });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user: user.toJSON(), token: generateToken(user) },
    });
  } catch (err) {
    return next(err);
  }
};

