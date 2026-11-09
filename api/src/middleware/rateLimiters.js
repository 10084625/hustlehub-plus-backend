// References: [5] express-rate-limit, [6] RFC 6585 (HTTP 429),
// [22] RFC 9110 section 10.2.3 (Retry-After), [9] OWASP Authentication
// Cheat Sheet (limiting login attempts). README section 22 (References).
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { logEvent } = require('../utils/audit');

/**
 * Seconds the caller still has to wait before the limit resets.
 *
 * Part 2 feedback fix: the 429 response used to report the FULL window
 * (e.g. 900 seconds) as the retry time, even when most of the window had
 * already passed. The limiter's store records exactly when the caller's
 * window resets (req.rateLimit.resetTime), so the real remaining time is
 * resetTime minus now, rounded up to whole seconds and never below 1.
 * The full window is only used if a store cannot provide a reset time.
 */
const secondsUntilReset = (resetTime, windowMs, now = Date.now()) => {
  if (resetTime instanceof Date && !Number.isNaN(resetTime.getTime())) {
    return Math.max(1, Math.ceil((resetTime.getTime() - now) / 1000));
  }
  return Math.max(1, Math.ceil(windowMs / 1000));
};

/**
 * Builds a limiter that answers with the same JSON envelope as every other
 * error, tells the caller how long to wait (the true remaining time, in both
 * the body and the standard Retry-After header), sends the standard
 * RateLimit-* headers (draft-7) and records the event in the security log.
 */
const buildLimiter = ({ name, max, windowMin, message, keyGenerator }) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res, next, options) => {
      const retryAfterSeconds = secondsUntilReset(req.rateLimit && req.rateLimit.resetTime, options.windowMs);
      res.set('Retry-After', String(retryAfterSeconds));
      logEvent('warn', 'ratelimit.exceeded', req, { limiter: name, limit: options.limit, retryAfterSeconds });
      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    },
  });

  // Login and registration: stops password guessing and mass account creation.
// Keyed by IP + the email being tried, so one attacker cannot lock out
// everyone behind the same network, and one email cannot be hammered.
const authLimiter = buildLimiter({
  name: 'auth',
  ...config.rateLimit.auth,
  message: 'Too many sign-in attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${req.ip}|${email}`;
  },
});

// Second layer on auth routes: a per-IP ceiling, so an attacker cannot get
// around the per-email limit by spraying many different email addresses.
const authIpLimiter = buildLimiter({
  name: 'auth-ip',
  max: config.rateLimit.auth.max * 10,
  windowMin: config.rateLimit.auth.windowMin,
  message: 'Too many sign-in attempts from this network. Please wait before trying again.',
});

// Booking creation: stops a single account from flooding freelancers with
// fake bookings and the ledger with junk transactions. Keyed by user id
// (protect runs first), falling back to IP.
const bookingLimiter = buildLimiter({
  name: 'booking',
  ...config.rateLimit.booking,
  message: 'Too many bookings in a short time. Please wait before booking again.',
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
});

// A generous ceiling for the whole API to blunt scraping and basic DoS.
const globalLimiter = buildLimiter({
  name: 'global',
  ...config.rateLimit.global,
  message: 'Too many requests. Please slow down and try again shortly.',
});

module.exports = { authLimiter, authIpLimiter, bookingLimiter, globalLimiter, secondsUntilReset, buildLimiter };