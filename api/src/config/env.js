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

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  fail('MONGO_URI is not set. See .env.example.');
}

const int = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5000),
  mongoUri,

  jwt: Object.freeze({
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'hustlehub-plus-api',
    audience: process.env.JWT_AUDIENCE || 'hustlehub-plus-client',
    // One algorithm only. Verification rejects anything else, which blocks
    // "alg: none" and algorithm-confusion attacks.
    algorithm: 'HS256',
  }),

  bcrypt: Object.freeze({
    saltRounds: int(process.env.BCRYPT_SALT_ROUNDS, 12),
  }),

  ssl: Object.freeze({
    keyPath: path.resolve(process.cwd(), process.env.SSL_KEY_PATH || './certs/key.pem'),
    certPath: path.resolve(process.cwd(), process.env.SSL_CERT_PATH || './certs/cert.pem'),
  }),

  cors: Object.freeze({
    origin: (process.env.CORS_ORIGIN || 'https://localhost:3000').split(',').map((o) => o.trim()),
  }),

  rateLimit: Object.freeze({
    auth: { max: int(process.env.RATE_LIMIT_AUTH_MAX, 10), windowMin: int(process.env.RATE_LIMIT_AUTH_WINDOW_MIN, 15) },
    booking: { max: int(process.env.RATE_LIMIT_BOOKING_MAX, 10), windowMin: int(process.env.RATE_LIMIT_BOOKING_WINDOW_MIN, 10) },
    global: { max: int(process.env.RATE_LIMIT_GLOBAL_MAX, 300), windowMin: int(process.env.RATE_LIMIT_GLOBAL_WINDOW_MIN, 15) },
  }),
});

module.exports = config;
