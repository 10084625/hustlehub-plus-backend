const mongoose = require('mongoose');
const config = require('../config/env');

/**
 * Security and business audit trail (Part 3).
 *
 * One document per important event: sign-ins, failed sign-ins, lockouts,
 * logouts, refused requests, rate-limit hits, bookings, transactions, admin
 * actions, ledger checks and server errors.
 *
 * The collection is append-only from the application's point of view: there
 * is no API route that edits or deletes an entry, and the schema refuses
 * update and delete queries. MongoDB removes entries automatically after
 * AUDIT_RETENTION_DAYS (default 90) through a TTL index, so personal data
 * such as IP addresses is not kept forever (POPIA data minimisation).
 */
const LEVELS = Object.freeze(['info', 'warn', 'error']);

const auditLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true, maxlength: 80 },
    level: { type: String, enum: LEVELS, default: 'info', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, maxlength: 20 },
    ip: { type: String, maxlength: 64 },
    requestId: { type: String, maxlength: 64 },
    method: { type: String, maxlength: 10 },
    path: { type: String, maxlength: 200 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' }
);