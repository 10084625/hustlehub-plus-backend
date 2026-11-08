/**
 * Centralised environment configuration.
 *
 * Every value the app needs from process.env is read here and nowhere else.
 * Security-critical values are REQUIRED in every environment: the app fails
 * fast at startup instead of silently falling back to a weak default.
 *
 * Part 1 feedback fix: the old config fell back to a hard-coded JWT secret
 * when JWT_SECRET was missing. Anyone who read the source could then forge
 * tokens. There is now no fallback at all - a missing or short secret stops
 * the server from booting.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const MIN_SECRET_LENGTH = 32;

const fail = (message) => {
  // eslint-disable-next-line no-console
  console.error(`FATAL CONFIG ERROR: ${message}`);
  process.exit(1);
};
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  fail('JWT_SECRET is not set. Copy .env.example to .env and set a long random secret.');
}
if (jwtSecret.length < MIN_SECRET_LENGTH) {
  fail(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
}