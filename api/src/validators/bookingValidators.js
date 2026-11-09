const { body, param, query } = require('express-validator');
const { AGE_GROUPS } = require('../utils/taxCalculator');
const { LEVELS } = require('../models/AuditLog');
const { validate } = require('./common');
const { stripHtml } = require('../utils/sanitize');

const createBookingValidation = validate({ body: ['gigId', 'notes'] }, [
  body('gigId').exists({ values: 'falsy' }).withMessage('gigId is required.').bail().isMongoId().withMessage('gigId is not valid.'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be text.')
    .bail()
    .customSanitizer(stripHtml)
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or fewer.'),
]);

const bookingIdValidation = validate({}, [param('id').isMongoId().withMessage('Booking id is not valid.')]);

const userIdValidation = validate({ body: ['isActive'] }, [
  param('id').isMongoId().withMessage('User id is not valid.'),
  body('isActive').exists().withMessage('isActive is required.').bail().isBoolean({ strict: true }).withMessage('isActive must be true or false.').toBoolean(),
]);

const noInputValidation = validate({}, []);

// Part 3: tax estimate options
const taxEstimateValidation = validate({ query: ['ageGroup'] }, [
  query('ageGroup')
    .optional()
    .isString()
    .bail()
    .isIn(AGE_GROUPS)
    .withMessage(`ageGroup must be one of: ${AGE_GROUPS.join(', ')}.`),
]);

// Part 3: admin audit log filters.
// An event prefix is 1 to 4 dot-separated words of lower-case letters and
// underscores ("auth", "auth.login"). Checked by splitting on dots and
// testing each simple part, instead of one regex with a repeated group,
// which ESLint's safe-regex rule flagged (static analysis finding fix).
const isEventPrefix = (value) => {
  const parts = String(value).split('.');
  return parts.length <= 4 && parts.every((p) => /^[a-z_]{1,30}$/.test(p));
};

const auditLogValidation = validate({ query: ['level', 'event', 'limit'] }, [
  query('level').optional().isIn(LEVELS).withMessage(`level must be one of: ${LEVELS.join(', ')}.`),
  query('event')
    .optional()
    .isString()
    .bail()
    .custom(isEventPrefix)
    .withMessage('event must be an event name or prefix such as "auth" or "auth.login".'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200.').toInt(),
]);

module.exports = {
  createBookingValidation,
  bookingIdValidation,
  userIdValidation,
  noInputValidation,
  taxEstimateValidation,
  auditLogValidation,
};