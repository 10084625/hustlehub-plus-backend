/**
 * Docker HEALTHCHECK: exits 0 when the API answers GET /api/health over HTTPS.
 * The certificate is self-signed for local use, so it is not verified here.
 * This only affects this one local request inside the container.
 */
const https = require('https');

const req = https.get(
  { host: '127.0.0.1', port: process.env.PORT || 5000, path: '/api/health', rejectUnauthorized: false, timeout: 4000 },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1)
);
req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});
