// References: [13] OWASP Logging Cheat Sheet (what to log, what never to
// log), [14] winston, [15] Azure Monitor Application Insights. README section 22 (References).
const fs = require('fs');
const winston = require('winston');
const config = require('../config/env');
const telemetry = require('../telemetry');
const { AzureTransport } = require('./azureTransport');

/**
 * Central application logger (Part 3).
 *
 * Every log line is a structured JSON object, so it can be searched and
 * filtered in a log platform (for example "event = auth.login.failed").
 *
 * Where logs go:
 *   1. Console            always (pretty in development, JSON in Docker/production)
 *   2. logs/app.log       every event at the configured level and above
 *   3. logs/error.log     errors only, so problems are quick to find
 *   4. Azure              Application Insights (cloud), only when
 *                         APPLICATIONINSIGHTS_CONNECTION_STRING is set
 *
 * Sensitive values are removed by the redact() format BEFORE any transport
 * sees them, so a careless log call can never write a password or token.
 */

// Keys whose values must never be written to a log.
const SECRET_KEY = /pass(word)?|token|secret|authorization|cookie|jwt|signature|apikey|api_key/i;
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Masks an email so logs show which account without storing the full address. */
const maskEmail = (text) => text.replace(EMAIL, '$1***@$2');

/**
 * Deep-copies a log object, replacing secret values with [REDACTED] and
 * masking email addresses. Depth-limited so a circular or huge object cannot
 * stall the logger.
 */
const redactValue = (value, depth = 0) => {
  if (depth > 6) return '[TRUNCATED]';
  if (typeof value === 'string') return maskEmail(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactValue(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    // Built with Object.fromEntries rather than out[key] = ..., so a key such
    // as "__proto__" in logged data can never change the object's prototype
    // (ESLint security finding fix).
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : redactValue(v, depth + 1)])
    );
  }
  return value;
};

// Winston keeps level/message on special Symbol keys. Those are copied back
// untouched; everything else goes through redactValue().
const redact = winston.format((info) => {
  const clean = redactValue({ ...info });
  Object.getOwnPropertySymbols(info).forEach((sym) => {
    Object.defineProperty(clean, sym, Object.getOwnPropertyDescriptor(info, sym));
  });
  return clean;
});

const base = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: false }),
  redact(),
  winston.format.json()
);

const devConsole = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  redact(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, event, requestId, service: _s, env: _e, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    const tag = event && event !== message ? ` [${event}]` : '';
    const rid = requestId ? ` (${String(requestId).slice(0, 8)})` : '';
    return `${timestamp} ${level}${tag}${rid} ${message}${meta}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: config.logging.json ? base : devConsole,
    silent: config.nodeEnv === 'test',
  }),
];

if (config.logging.toFile) {
  try {
    // LOG_DIR comes from the server's environment only, never from a request.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.mkdirSync(config.logging.dir, { recursive: true });
    transports.push(
      new winston.transports.File({
        filename: `${config.logging.dir}/app.log`,
        format: base,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      }),
      new winston.transports.File({
        filename: `${config.logging.dir}/error.log`,
        level: 'error',
        format: base,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      })
    );
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[logger] Could not create the log folder. Logging to the console only.');
  }
}

const azureClient = telemetry.getClient();
if (azureClient) {
  transports.push(
    new AzureTransport({
      client: azureClient,
      format: winston.format.combine(winston.format.timestamp(), redact()),
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  levels: winston.config.npm.levels,
  defaultMeta: { service: 'hustlehub-api', env: config.nodeEnv },
  transports,
  exitOnError: false,
});

/** Sends any buffered cloud logs before the process exits. */
logger.flush = () => telemetry.flush();

logger.cloudEnabled = Boolean(azureClient);

module.exports = logger;
module.exports.redactValue = redactValue;
module.exports.maskEmail = maskEmail;