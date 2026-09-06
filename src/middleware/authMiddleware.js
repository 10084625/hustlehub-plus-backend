const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const { findById } = require('../models/userModel');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authorised. Please log in to access this resource.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = findById(decoded.id);
    if (!user) {
      return next(new AppError('Not authorised. Please log in to access this resource.', 401));
    }

    req.user = { id: user.id, role: user.role, email: user.email, username: user.username };
    return next();
  } catch (err) {
    return next(new AppError('Not authorised. Please log in to access this resource.', 401));
  }
};