const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.createCouponValidator = [
  check("couponCode")
    .notEmpty()
    .withMessage("Coupon code is required")
    .isString()
    .withMessage("Coupon code must be a string"),

  check("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Invalid date format for start date"),

  check("expiryDate")
    .notEmpty()
    .withMessage("Expiry date is required")
    .isISO8601()
    .withMessage("Invalid date format for expiry date"),

  check("discountValue")
    .notEmpty()
    .withMessage("Discount value is required")
    .isNumeric()
    .withMessage("Discount value must be a number")
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && (value <= 0 || value > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
      return true;
    }),

  check("discountType")
    .optional()
    .isIn(["fixed", "percentage", "free_shipping"])
    .withMessage("Invalid discount type"),

  check("maxUses")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Max uses must be a number"),

  validatorMiddleware,
];

exports.updateCouponValidator = [
  check("id").isMongoId().withMessage("Invalid coupon id format"),
  check("couponCode")
    .optional()
    .isString()
    .withMessage("Coupon code must be a string"),
  check("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for start date"),
  check("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for expiry date"),
  check("discountValue")
    .optional()
    .isNumeric()
    .withMessage("Discount value must be a number")
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && (value <= 0 || value > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
      return true;
    }),
  check("discountType")
    .optional()
    .isIn(["fixed", "percentage", "free_shipping"])
    .withMessage("Invalid discount type"),
  check("maxUses")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Max uses must be a number"),
  validatorMiddleware,
];

exports.applyCouponValidator = [
  check("couponCode")
    .notEmpty()
    .withMessage("Coupon code is required")
    .isString()
    .withMessage("Coupon code must be a string"),
  validatorMiddleware,
];
