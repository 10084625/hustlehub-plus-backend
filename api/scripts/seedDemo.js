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

  
  // Bookings spread over the months of the tax year that have started
  const year = taxYearFor(new Date());
  const now = Date.now();
  let count = 0;
  for (let m = 0; m < year.monthsElapsed; m += 1) {
    const perMonth = 1 + ((m * 7) % 3); // 1 to 3 bookings, varies by month
    for (let k = 0; k < perMonth; k += 1) {
      const gig = gigs[(m + k) % gigs.length];
      const day = 3 + ((k * 9 + m * 5) % 24);
      const at = new Date(Date.UTC(year.start.getUTCFullYear(), 2 + m, day, 9 + k, 0, 0));
      if (at.getTime() <= now) {
        const booking = await Booking.create({
          gig: gig._id, client: client._id, freelancer: freelancer._id,
          gigTitle: gig.title, amount: gig.price, status: m < year.monthsElapsed - 1 ? 'completed' : 'confirmed',
          createdAt: at, updatedAt: at,
        });
        const fee = round2(gig.price * PLATFORM_FEE_RATE);
        await Transaction.create({
          reference: `HH-DEMO${String(count).padStart(3, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          booking: booking._id, client: client._id, freelancer: freelancer._id,
          amount: gig.price, platformFee: fee, freelancerEarnings: round2(gig.price - fee),
          createdAt: at, updatedAt: at,
        });
        count += 1;
      }
    }
  }
  console.log(`Demo data ready: ${count} bookings for demo_freelancer in tax year ${year.label}. Password: ${PASSWORD}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Demo seeding failed:', err.message);
  process.exit(1);
});
