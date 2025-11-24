const { query } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');

exports.validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer and at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limit must be an integer and at least 1'),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  query('fields')
    .optional()
    .isString()
    .withMessage('Fields must be a string (comma-separated)'),
  query('keyword')
    .optional()
    .isString()
    .withMessage('Keyword must be a string'),
  validatorMiddleware,
];
