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

const run = async () => {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error('Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env first.');
    process.exit(1);
  }
  await connectDB();
  //This establishes a connection to MongoDB using a predefined connectDB() utility.
  const password = await bcrypt.hash(ADMIN_PASSWORD, config.bcrypt.saltRounds);
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    Object.assign(existing, { username: ADMIN_USERNAME, password, role: 'admin', isActive: true });
    await existing.save();
  } else {
    await User.create({ username: ADMIN_USERNAME, email, password, role: 'admin' });
  }
  console.log(`Admin account ready: ${email}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});

//If anything unexpected crashes during execution (e.g., database connection timeout), 
//the .catch() block catches the exception, logs Seeding failed: [error message], 
//and exits with a failure code.


