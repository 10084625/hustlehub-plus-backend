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

if (config.nodeEnv === 'production') {
  console.error('seed:demo is for local development only.');
  process.exit(1);
}

const PASSWORD = process.env.DEMO_PASSWORD || 'Demo!Pass2026';
const round2 = (n) => Math.round(n * 100) / 100;

const upsertUser = async (username, email, role, hash) => {
  const user = (await User.findOne({ email })) || new User({ username, email, role });
  Object.assign(user, { username, password: hash, role, isActive: true });
  await user.save();
  return user;
};

const GIGS = [
  { title: 'Full brand identity package', description: 'Logo, colour palette, typography and a brand guidelines document for your business.', category: 'design', price: 18500, deliveryDays: 14 },
  { title: 'React web app bug fixing', description: 'I find and fix bugs in your React or Node.js app and explain what went wrong.', category: 'development', price: 6500, deliveryDays: 3 },
  { title: 'Website copy that converts', description: 'Clear, friendly website copy for up to five pages, written for South African customers.', category: 'writing', price: 4200, deliveryDays: 5 },
];

const run = async () => {
  await connectDB();
  const hash = await bcrypt.hash(PASSWORD, config.bcrypt.saltRounds);
  const freelancer = await upsertUser('demo_freelancer', 'demo.freelancer@hustlehub.local', 'freelancer', hash);
  const client = await upsertUser('demo_client', 'demo.client@hustlehub.local', 'client', hash);

  // Start clean for the demo freelancer
  await Promise.all([
    Transaction.deleteMany({ freelancer: freelancer._id }),
    Booking.deleteMany({ freelancer: freelancer._id }),
    Gig.deleteMany({ freelancer: freelancer._id }),
  ]);
  const gigs = await Gig.insertMany(GIGS.map((g) => ({ ...g, freelancer: freelancer._id })));
