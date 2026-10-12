const { body, param, query } = require('express-validator');
const { validate } = require('./common');
const { stripHtml } = require('../utils/sanitize');
const { GIG_CATEGORIES } = require('../models/Gig');

const GIG_FIELDS = ['title', 'description', 'category', 'price', 'deliveryDays', 'isActive'];

const idParam = param('id').isMongoId().withMessage('Gig id is not valid.');

// Shared field rules. "optional" is switched on for updates.
const gigFieldRules = (isUpdate) => {
  const req = (chain, label) =>
    isUpdate ? chain.optional() : chain.exists({ values: 'null' }).withMessage(`${label} is required.`).bail();

  return [
    req(body('title'), 'Title')
      .isString()
      .withMessage('Title must be text.')
      .bail()
      .customSanitizer(stripHtml)
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters (HTML is removed).'),
    req(body('description'), 'Description')
      .isString()
      .withMessage('Description must be text.')
      .bail()
      .customSanitizer(stripHtml)
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters (HTML is removed).'),
    req(body('category'), 'Category')
      .isString()
      .withMessage('Category must be text.')
      .bail()
      .trim()
      .isIn(GIG_CATEGORIES)
      .withMessage(`Category must be one of: ${GIG_CATEGORIES.join(', ')}.`),
    req(body('price'), 'Price')
      .isFloat({ min: 1, max: 1000000 })
      .withMessage('Price must be a number between 1 and 1,000,000.')
      .bail()
      .custom((v) => /^\d+(\.\d{1,2})?$/.test(String(v)))
      .withMessage('Price may have at most two decimal places.')
      .toFloat(),
    req(body('deliveryDays'), 'Delivery days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Delivery days must be a whole number between 1 and 365.')
      .toInt(),
    body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive must be true or false.').toBoolean(),
  ];
};

const createGigValidation = validate({ body: GIG_FIELDS }, gigFieldRules(false));

const updateGigValidation = validate({ body: GIG_FIELDS }, [
  idParam,
  body().custom((b) => Object.keys(b || {}).length > 0).withMessage('Provide at least one field to update.'),
  ...gigFieldRules(true),
]);

const gigIdValidation = validate({}, [idParam]);

const listGigsValidation = validate({ query: ['search', 'category', 'minPrice', 'maxPrice', 'page', 'limit'] }, [
  query('search')
    .optional()
    .isString()
    .bail()
    .customSanitizer(stripHtml)
    .isLength({ max: 60 })
    .withMessage('Search text must be 60 characters or fewer.'),
  query('category').optional().isIn(GIG_CATEGORIES).withMessage('Unknown category.'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a positive number.').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a positive number.').toFloat(),
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('page must be a whole number from 1.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50.').toInt(),
]);

const gigListMineValidation = validate({}, []);

module.exports = { gigListMineValidation, createGigValidation, updateGigValidation, gigIdValidation, listGigsValidation };
