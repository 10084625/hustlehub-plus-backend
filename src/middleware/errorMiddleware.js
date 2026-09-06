const config = require('../config/env');

/**
 * notFound - catches any request to a route that doesn't exist and
 * forwards it to the global error handler as a clean 404, instead of
 * letting Express return its default (and more revealing) HTML error page.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true; // a 404 is an expected, safe-to-report condition
  next(error);
};

/**
 * globalErrorHandler - the single place where every error in the
 * application ends up. This guarantees a consistent, safe response shape
 * and means sensitive internals (stack traces, file paths, library
 * versions, DB error text) are NEVER sent to the client.
 *
 * - "Operational" errors (AppError instances, e.g. bad input, invalid
 *   credentials) send their intended message and status code.
 * - Anything else (a genuine bug/crash) is logged in full server-side
 *   for debugging, but the client only ever receives a generic message.
 */
