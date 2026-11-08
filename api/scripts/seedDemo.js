/**
 * DEMO DATA for the video and screenshots.
 *   npm run seed:demo
 *
 * Creates (or refreshes) a demo freelancer and a demo client, a few gigs and
 * a spread of bookings across the current tax year, so the income and tax
 * dashboard has something meaningful to show. Every booking gets a signed
 * transaction exactly like a real one (the Transaction model signs on save).
 *
 * Accounts (password from DEMO_PASSWORD, default shown):
 *   demo.freelancer@hustlehub.local / Demo!Pass2026
 *   demo.client@hustlehub.local     / Demo!Pass2026
 * Local development only. Never run this against a real database.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const connectDB = require('../src/config/db');
const { User } = require('../src/models/User');
const { Gig } = require('../src/models/Gig');
const { Booking } = require('../src/models/Booking');
const { Transaction, PLATFORM_FEE_RATE } = require('../src/models/Transaction');
const { taxYearFor } = require('../src/utils/taxCalculator');
