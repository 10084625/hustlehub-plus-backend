const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * requestId - gives every request a random id (Part 3).
 * It is returned in the X-Request-Id header and in error responses, and it
 * is attached to every log line for that request. When a user reports a
 * problem, the id links their screen to the exact server log entries.
 * An id sent by the client is ignored, so nobody can inject fake ids into
 * our logs.
 */
const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

/**
 * accessLog - one structured "http" log line per request, written when the
 * response finishes. Only the path is logged (never the query string, body
 * or headers), so search text, passwords and tokens stay out of the logs.
 */
const accessLog = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const status = res.statusCode;
    let level = 'http';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warn';
    logger.log(level, `${req.method} ${(req.originalUrl || '').split('?')[0]} ${status}`, {
      event: 'http.request',
      requestId: req.id,
      method: req.method,
      path: (req.originalUrl || '').split('?')[0].slice(0, 200),
      status,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      user: req.user ? req.user.id : undefined,
    });
  });
  next();
};

module.exports = { requestId, accessLog };