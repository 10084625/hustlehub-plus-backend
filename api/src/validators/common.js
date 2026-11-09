const { validationResult, matchedData } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * allowOnlyFields - Part 1 feedback fix.
 *
 * The README described an allow-list approach, but unexpected fields were
 * silently ignored rather than rejected. This middleware now enforces it: any
 * body or query property that is not on the list causes a 400, so attempts at
 * mass assignment (e.g. sending "role":"admin" or "isActive":false) or
 * probing with extra fields are refused outright.
 */
const allowOnlyFields =
  ({ body = [], query = [] } = {}) =>
  (req, res, next) => {
    const reqBody = req.body;
    if (reqBody !== undefined && (typeof reqBody !== 'object' || reqBody === null || Array.isArray(reqBody))) {
      return next(new AppError('Request body must be a JSON object.', 400));
    }
    const unexpectedBody = Object.keys(reqBody || {}).filter((k) => !body.includes(k));
    const unexpectedQuery = Object.keys(req.query || {}).filter((k) => !query.includes(k));
    const unexpected = [...unexpectedBody, ...unexpectedQuery];

    if (unexpected.length > 0) {
      // Field names are not echoed back, only a count, to avoid reflecting input.
      return next(
        new AppError(
          `Request contains ${unexpected.length} unexpected field${unexpected.length > 1 ? 's' : ''}. Only documented fields are accepted.`,
          400
        )
      );
    }
    return next();
  };

/**
 * Collects express-validator errors into one safe 400 response. On success,
 * replaces req.body with ONLY the validated, sanitised values so a
 * controller can never accidentally read an unvalidated property.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = [...new Set(errors.array().map((e) => e.msg))];
    return next(new AppError(messages.join(' '), 400));
  }
  req.validated = {
    body: matchedData(req, { locations: ['body'], includeOptionals: false }),
    query: matchedData(req, { locations: ['query'], includeOptionals: false }),
    params: matchedData(req, { locations: ['params'], includeOptionals: false }),
  };
  return next();
};

/**
 * Bundles: [field allow-list, ...rules, error collector]
 */
const validate = (allowed, rules = []) => [allowOnlyFields(allowed), ...rules, handleValidationErrors];

module.exports = { allowOnlyFields, handleValidationErrors, validate };