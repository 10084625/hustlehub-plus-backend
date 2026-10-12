/**
 * Creates (or resets) the platform admin account.
 *   npm run seed:admin
 * Admins can never sign up through the API; this script is the only way to
 * create one, and it reads the credentials from .env, not from the code.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const connectDB = require('../src/config/db');
const { User } = require('../src/models/User');

