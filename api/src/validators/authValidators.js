const { body } = require('express-validator');
const { validate } = require('./common');
const { SELF_ASSIGNABLE_ROLES } = require('../models/User');

const isString = (field) => body(field).isString().withMessage(`${field} must be text.`).bail();

const registerValidation = validate({ body: ['username', 'email', 'password', 'role'] }, [
  body('username').exists({ values: 'falsy' }).withMessage('Username is required.').bail(),
  isString('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscores.'),

  body('email').exists({ values: 'falsy' }).withMessage('Email is required.').bail(),
  isString('email')
    .trim()
    .isLength({ max: 254 })
    .withMessage('Email is too long.')
    .isEmail()
    .withMessage('A valid email address is required.')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password').exists({ values: 'falsy' }).withMessage('Password is required.').bail(),
  isString('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Password must contain at least one special character.'),

  body('role')
    .optional()
    .isString()
    .withMessage('Role must be text.')
    .bail()
    .trim()
    .isIn(SELF_ASSIGNABLE_ROLES)
    .withMessage('Role must be either "client" or "freelancer".'),
]);

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

module.exports = { registerValidation, loginValidation };