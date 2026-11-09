// References: [15] Microsoft, "Azure Monitor Application Insights",
// [14] winston. README section 22 (References).
const config = require('./config/env');

/**
 * Azure Application Insights (Part 3, cloud logging).
 *
 * Turned on only when APPLICATIONINSIGHTS_CONNECTION_STRING is set, and
 * never during automated tests. It must start BEFORE Express, Mongoose and
 * the HTTPS server are loaded, so server.js requires this file first.
 *
 * What Azure then receives:
 *   - every request (method, path, status, duration) and every failure,
 *     collected automatically by the SDK ("requests" and "exceptions" tables)
 *   - calls to MongoDB ("dependencies" table)
 *   - live CPU, memory and request rates (Live Metrics)
 *   - every app event from our logger, e.g. auth.login.failed or
 *     transaction.created ("traces" table), already redacted
 */
let client = null;

if (config.logging.azureConnectionString && config.nodeEnv !== 'test') {
  // The name the app appears under in Azure (Application Map, filters)
  process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'hustlehub-api';
  const appInsights = require('applicationinsights');
  appInsights
    .setup(config.logging.azureConnectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectPerformance(true, false)
    // Our logger already sends every event, already redacted. Collecting the
    // console as well would send everything twice, unredacted formatting included.
    .setAutoCollectConsole(false)
    .setSendLiveMetrics(true)
    .setInternalLogging(false, false)
    .start();
  client = appInsights.defaultClient;
}

module.exports = {
  getClient: () => client,
  flush: async () => {
    if (!client) return;
    try {
      await client.flush();
    } catch {
      /* shutting down; nothing else to do */
    }
  },
};