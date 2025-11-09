const { check } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');

exports.createCompanyValidator = [
  check('companyName')
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2 })
    .withMessage('Too short company name'),
  check('companyNameEn')
    .notEmpty()
    .withMessage('English company name is required'),
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20 })
    .withMessage('Too short company description'),
  check('descriptionEn')
    .notEmpty()
    .withMessage('English description is required'),
  check('country')
    .notEmpty()
    .withMessage('Country is required'),
  check('city')
    .notEmpty()
    .withMessage('City is required'),
  check('email')
    .notEmpty()
    .withMessage('Company email is required')
    .isEmail()
    .withMessage('Invalid email address'),
  check('categoryId')
    .notEmpty()
    .withMessage('Company must belong to a category')
    .isMongoId()
    .withMessage('Invalid ID format for category'),
  check('whatsapp')
    .optional()
    .isMobilePhone(['en-US', 'ar-SA', 'ar-EG']) // Example locales
    .withMessage('Invalid WhatsApp number'),
  check('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  validatorMiddleware,
];
