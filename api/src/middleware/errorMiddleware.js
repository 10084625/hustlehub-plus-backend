const logger = require('../utils/logger');
const { logEvent } = require('../utils/audit');

/**
 * notFound - turns unknown routes into a clean JSON 404.
 * The requested path is NOT echoed back, so the response cannot be used to
 * reflect attacker-controlled text.
 */
const notFound = (req, res, next) => {
  const error = new Error('The requested resource was not found.');
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};