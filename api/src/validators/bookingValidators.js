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