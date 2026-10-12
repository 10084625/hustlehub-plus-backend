const config = require('../config/env');

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

/**
 * Translates known library errors into safe operational errors.
 */
const normaliseError = (err) => {
  // Malformed JSON body sent to express.json()
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body is not valid JSON.', isOperational: true };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large.', isOperational: true };
  }
  // Mongoose: invalid ObjectId and similar casting problems
  if (err.name === 'CastError') {
    return { statusCode: 400, message: 'One of the supplied values has an invalid format.', isOperational: true };
  }
  // Mongoose schema validation that slipped past express-validator
  if (err.name === 'ValidationError') {
    return { statusCode: 400, message: 'Some of the supplied data is invalid.', isOperational: true };
  }
  // MongoDB duplicate key (e.g. username or email already taken)
  if (err.code === 11000) {
    return { statusCode: 409, message: 'That record already exists.', isOperational: true };
  }
  return err;
};

/**
 * globalErrorHandler - the single exit point for every error. Clients only
 * get a status code and a safe message; stack traces, file paths, query
 * text and library errors stay in the server log.
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  const normalised = normaliseError(err);
  const statusCode = normalised.statusCode || 500;
  const isOperational = normalised.isOperational === true;

  if (config.nodeEnv !== 'test') {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${req.method} ${req.path} -> ${statusCode}: ${err.message}`);
    if (config.nodeEnv === 'development' && !isOperational) {
      // eslint-disable-next-line no-console
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? normalised.message : 'Something went wrong. Please try again later.',
  });
};

module.exports = { notFound, globalErrorHandler };
