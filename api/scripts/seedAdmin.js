/**
 * Creates (or resets) the platform admin account.
 *   npm run seed:admin
 * Admins can never sign up through the API; this script (or
 * SEED_ADMIN_ON_START in Docker) is the only way to create one, and it reads
 * the credentials from .env, not from the code.
 */
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { ensureAdmin } = require('../src/utils/seedAdmin');
