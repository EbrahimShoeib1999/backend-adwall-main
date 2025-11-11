const factory = require("./handlersFactory");
const Coupon = require("../model/couponModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

exports.getCoupons = factory.getAll(Coupon);
exports.getCoupon = factory.getOne(Coupon);
exports.createCoupon = factory.createOne(Coupon);
exports.updateCoupon = factory.updateOne(Coupon);
exports.deleteCoupon = factory.deleteOne(Coupon);

// @desc    Apply a coupon
// @route   POST /api/v1/coupons/apply
// @access  Private/User
exports.applyCoupon = asyncHandler(async (req, res, next) => {
  const { couponCode } = req.body;

  const coupon = await Coupon.findOne({ couponCode });

  if (!coupon) {
    return next(new ApiError("Coupon not found", 404));
  }

  if (!coupon.isActive) {
    return next(new ApiError("This coupon is not active", 400));
  }

  const now = new Date();
  if (now < coupon.startDate) {
    return next(new ApiError("This coupon has not started yet", 400));
  }

  if (now > coupon.expiryDate) {
    return next(new ApiError("This coupon has expired", 400));
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return next(new ApiError("This coupon has reached its usage limit", 400));
  }

  res.status(200).json({
    status: "success",
    data: coupon,
  });
});