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

/**
 * POST /api/auth/login - Public
 * Same error message for "no such user", "wrong password" and "deactivated",
 * so the endpoint cannot be used to discover which emails are registered.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const invalid = new AppError('Invalid email or password.', 401);

    const user = await User.findOne({ email }).select('+password');
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordMatches || !user.isActive) return next(invalid);

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

module.exports = { register, login, getProfile };
