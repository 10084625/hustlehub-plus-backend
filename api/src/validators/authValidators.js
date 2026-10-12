const { body } = require('express-validator');
const { validate } = require('./common');
const { SELF_ASSIGNABLE_ROLES } = require('../models/User');

const isString = (field) => body(field).isString().withMessage(`${field} must be text.`).bail();

const loginValidation = validate({ body: ['email', 'password'] }, [
  body('email').exists({ values: 'falsy' }).withMessage('Email is required.').bail(),
  isString('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password').exists({ values: 'falsy' }).withMessage('Password is required.').bail(),
  isString('password').isLength({ max: 128 }).withMessage('Password is too long.'),
]);

