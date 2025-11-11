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
    .withMessage("Discount value must be a number"),

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
