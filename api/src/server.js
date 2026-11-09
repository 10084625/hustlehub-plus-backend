// Azure Application Insights must start before anything else is loaded.
require('./telemetry');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { ensureAdmin } = require('./utils/seedAdmin');
const app = require('./app');

let server;

const startServer = async () => {
  let sslOptions;
  try {
    sslOptions = {
      // Static analysis note: these paths come only from the server's own
      // environment (SSL_KEY_PATH / SSL_CERT_PATH), never from a request, so
      // a user cannot choose which file is read.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      key: fs.readFileSync(config.ssl.keyPath),
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      cert: fs.readFileSync(config.ssl.certPath),
      minVersion: 'TLSv1.2',
    };
  } catch {
    logger.error('Could not read the SSL certificate/key. Run "npm run generate-certs" inside the api folder (see README).', {
      event: 'server.startup_failed',
      reason: 'ssl_files_missing',
    });
    await logger.flush();
    process.exit(1);
  }

  try {
    await connectDB();
  } catch {
    logger.error('Could not connect to MongoDB. Check MONGO_URI and that MongoDB is running.', {
      event: 'server.startup_failed',
      reason: 'database_unreachable',
    });
    await logger.flush();
    process.exit(1);
  }

  // Docker: make sure the admin account exists (credentials come from ADMIN_*).
  if (config.seedAdminOnStart) {
    try {
      const result = await ensureAdmin({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      });
      logger.info(`Admin account ${result.created ? 'created' : 'updated'}`, { event: 'admin.seeded', email: result.email });
    } catch (err) {
      logger.error('Admin seeding failed', { event: 'admin.seed_failed', reason: err.message });
    }
  }

  server = https.createServer(sslOptions, app).listen(config.port, () => {
    logger.info(`HustleHub+ API listening securely on https://localhost:${config.port}`, {
      event: 'server.started',
      port: config.port,
      environment: config.nodeEnv,
      cloudLogging: logger.cloudEnabled,
    });
  });
};

/**
 * Graceful shutdown (Part 3, needed in Docker): stop accepting requests,
 * let open ones finish, close the database connection and flush any cloud
 * logs, then exit. Docker sends SIGTERM on "docker compose down".
 */
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down`, { event: 'server.stopping' });
  const finish = async () => {
    await mongoose.disconnect().catch(() => {});
    await logger.flush();
    process.exit(0);
  };
  if (server) server.close(finish);
  else finish();
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', async (err) => {
  logger.error('Unhandled promise rejection, shutting down', {
    event: 'server.crash',
    reason: err && err.message,
  });
  await logger.flush();
  process.exit(1);
});

startServer();