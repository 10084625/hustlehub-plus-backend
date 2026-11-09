const Transport = require('winston-transport');

/**
 * Winston transport that sends each log entry to Azure Application Insights
 * as a "trace" (Part 3, cloud logging).
 *
 * - The log level becomes the Azure severity (warn -> Warning, error -> Error)
 * - The event name, request id, user, IP and details become "custom
 *   dimensions", so they can be filtered in Azure, for example:
 *     traces | where customDimensions.event == "auth.login.failed"
 * - Errors are also sent as exceptions so they show on the Failures page.
 * - "http.request" lines are skipped because the Azure SDK already records
 *   every request in its own "requests" table.
 * The entry has already passed through the logger's redact() step, so no
 * password, token or full email address can reach Azure.
 */
const SEVERITY = new Map([
  ['error', 'Error'],
  ['warn', 'Warning'],
  ['info', 'Information'],
  ['http', 'Verbose'],
  ['verbose', 'Verbose'],
  ['debug', 'Verbose'],
]);

/** Azure custom dimensions must be text, so objects are turned into JSON. */
const toDimensions = (entry) =>
  Object.fromEntries(
    Object.entries(entry)
      .filter(([key, value]) => !['level', 'message'].includes(key) && value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  );