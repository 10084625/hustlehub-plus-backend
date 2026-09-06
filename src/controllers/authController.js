const bcrypt = require('bcryptjs');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { findByEmail, createUser, toSafeUser } = require('../models/userModel');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (client or freelancer)
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = findByEmail(email);
    if (existingUser) {
      // User friendly error message for registration, but not for login. This is to prevent user enumeration attacks
      // do NOT confirm/deny account existence - see login().
      return next(new AppError('An account with this email already exists.', 409));
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const newUser = createUser({ username, email, passwordHash, role });
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: toSafeUser(newUser),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
};