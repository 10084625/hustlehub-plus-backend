// References: [13] OWASP Logging Cheat Sheet, [1] OWASP Top 10 A09
// Security Logging and Monitoring Failures. README section 22 (References).
const mongoose = require('mongoose');
const logger = require('./logger');
const { AuditLog } = require('../models/AuditLog');
const config = require('../config/env');

/**
 * logEvent - records one important event in two places:
 *   1. the application log (console, files and Azure Application Insights when enabled)
 *   2. the audit_logs collection in MongoDB, which admins can view in the app
 *      and users can partly see as "recent sign-in activity"
 *
 * Saving to MongoDB is fire-and-forget: if it fails, the request still
 * succeeds and the failure itself is logged. Logging must never break the
 * feature it is watching.
 *
 * Never pass passwords, tokens or full request bodies in `details`. The
 * logger redacts common secret field names anyway, as a safety net.
 *
 * @param {'info'|'warn'|'error'} level
 * @param {string} event      dotted name, e.g. "auth.login.failed"
 * @param {import('express').Request|null} req  used for user, IP and request id
 * @param {object} details    small, non-sensitive extra facts
 * @param {object} options    { userId } when the user is known but not on req
 */
const logEvent = (level, event, req = null, details = {}, { userId } = {}) => {
  const user = userId || (req && req.user && req.user.id) || undefined;
  const entry = {
    event,
    user,
    role: req && req.user ? req.user.role : undefined,
    ip: req ? req.ip : undefined,
    requestId: req ? req.id : undefined,
    method: req ? req.method : undefined,
    path: req ? (req.originalUrl || '').split('?')[0].slice(0, 200) : undefined,
    details,
  };

  logger.log(level, event, entry);

  if (config.nodeEnv === 'test' || mongoose.connection.readyState !== 1) return;
  const safeUser = user && mongoose.isValidObjectId(user) ? user : undefined;
  AuditLog.create({ ...entry, level, user: safeUser, details: logger.redactValue(details) }).catch((err) => {
    logger.error('audit.write_failed', { event: 'audit.write_failed', reason: err.message });
  });
};

module.exports = { logEvent };