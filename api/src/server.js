const fs = require('fs');
const https = require('https');
const config = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  let sslOptions;
  try {
    sslOptions = {
      key: fs.readFileSync(config.ssl.keyPath),
      cert: fs.readFileSync(config.ssl.certPath),
      minVersion: 'TLSv1.2',
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\n[STARTUP ERROR] Could not read the SSL certificate/key.');
    // eslint-disable-next-line no-console
    console.error('Run "npm run generate-certs" inside the api folder (see README).\n');
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[STARTUP ERROR] Could not connect to MongoDB. Check MONGO_URI and that MongoDB is running.');
    process.exit(1);
  }

  https.createServer(sslOptions, app).listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`HustleHub+ API listening securely on https://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`Environment: ${config.nodeEnv}`);
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED REJECTION! Shutting down...', err && err.message);
  process.exit(1);
});
