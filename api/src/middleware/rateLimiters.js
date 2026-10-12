const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Builds a limiter that answers with the same JSON envelope as every other
 * error, tells the caller how long to wait, and sends standard
 * RateLimit-* headers (draft-7) so clients can see their remaining quota.
 */
const buildLimiter = ({ max, windowMin, message, keyGenerator }) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res, next, options) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
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
  ...config.rateLimit.auth,
  message: 'Too many sign-in attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${req.ip}|${email}`;
  },
});

// Booking creation: stops a single account from flooding freelancers with
// fake bookings and the ledger with junk transactions. Keyed by user id
// (protect runs first), falling back to IP.
const bookingLimiter = buildLimiter({
  ...config.rateLimit.booking,
  message: 'Too many bookings in a short time. Please wait before booking again.',
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
});

// A generous ceiling for the whole API to blunt scraping and basic DoS.
const globalLimiter = buildLimiter({
  ...config.rateLimit.global,
  message: 'Too many requests. Please slow down and try again shortly.',
});

module.exports = { authLimiter, bookingLimiter, globalLimiter };

// Second layer on auth routes: a per-IP ceiling, so an attacker cannot get
// around the per-email limit by spraying many different email addresses.
const authIpLimiter = buildLimiter({
  max: config.rateLimit.auth.max * 10,
  windowMin: config.rateLimit.auth.windowMin,
  message: 'Too many sign-in attempts from this network. Please wait before trying again.',
});

module.exports.authIpLimiter = authIpLimiter;
