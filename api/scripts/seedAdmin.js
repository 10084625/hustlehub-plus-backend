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

const run = async () => {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  await connectDB();
  const result = await ensureAdmin({ username: ADMIN_USERNAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`Admin account ready: ${result.email}`);
  await mongoose.disconnect();
};


run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});