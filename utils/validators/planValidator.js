const { check } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');

exports.getPlanValidator = [
  check('id').isMongoId().withMessage('Invalid plan id format'),
  validatorMiddleware,
];

exports.createPlanValidator = [
  check('name')
    .notEmpty()
    .withMessage('Plan name is required')
    .isString()
    .withMessage('Plan name must be a string'),
  check('code')
    .notEmpty()
    .withMessage('Plan code is required')
    .isString()
    .withMessage('Plan code must be a string'),
  check('color').optional().isString().withMessage('Plan color must be a string'),
  check('description').optional().isString().withMessage('Plan description must be a string'),
  check('planType')
    .notEmpty()
    .withMessage('Plan type is required')
    .isIn(['Basic', 'Standard', 'Premium', 'Monthly'])
    .withMessage('Invalid plan type'),
  check('options')
    .isArray({ min: 1 })
    .withMessage('Plan must have at least one option'),
  check('options.*.duration')
    .notEmpty()
    .withMessage('Option duration is required')
    .isString()
    .withMessage('Option duration must be a string'),
  check('options.*.priceUSD')
    .notEmpty()
    .withMessage('Option priceUSD is required')
    .isNumeric()
    .withMessage('Option priceUSD must be a number'),
  check('options.*.discountPercent')
    .optional()
    .isNumeric()
    .withMessage('Option discountPercent must be a number'),
  check('options.*.finalPriceUSD')
    .notEmpty()
    .withMessage('Option finalPriceUSD is required')
    .isNumeric()
    .withMessage('Option finalPriceUSD must be a number'),
  check('options.*.adsCount')
    .notEmpty()
    .withMessage('Option adsCount is required')
    .isNumeric()
    .withMessage('Option adsCount must be a number'),
  check('options.*.categories')
    .optional()
    .isArray()
    .withMessage('Option categories must be an array of strings'),
  check('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array of strings'),
  check('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validatorMiddleware,
];

exports.updatePlanValidator = [
  check('id').isMongoId().withMessage('Invalid plan id format'),
  check('name').optional().isString().withMessage('Plan name must be a string'),
  check('code').optional().isString().withMessage('Plan code must be a string'),
  check('color').optional().isString().withMessage('Plan color must be a string'),
  check('description').optional().isString().withMessage('Plan description must be a string'),
  check('planType')
    .optional()
    .isIn(['Basic', 'Standard', 'Premium', 'Monthly'])
    .withMessage('Invalid plan type'),
  check('options')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Plan must have at least one option'),
  check('options.*.duration')
    .optional()
    .isString()
    .withMessage('Option duration must be a string'),
  check('options.*.priceUSD')
    .optional()
    .isNumeric()
    .withMessage('Option priceUSD must be a number'),
  check('options.*.discountPercent')
    .optional()
    .isNumeric()
    .withMessage('Option discountPercent must be a number'),
  check('options.*.finalPriceUSD')
    .optional()
    .isNumeric()
    .withMessage('Option finalPriceUSD must be a number'),
  check('options.*.adsCount')
    .optional()
    .isNumeric()
    .withMessage('Option adsCount must be a number'),
  check('options.*.categories')
    .optional()
    .isArray()
    .withMessage('Option categories must be an array of strings'),
  check('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array of strings'),
  check('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validatorMiddleware,
];

exports.deletePlanValidator = [
  check('id').isMongoId().withMessage('Invalid plan id format'),
  validatorMiddleware,
];
