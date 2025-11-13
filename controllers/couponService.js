// couponService.js
const factory = require("./handlersFactory");
const Coupon = require("../model/couponModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const { sendSuccessResponse, statusCodes } = require("../utils/responseHandler");

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
    return next(new ApiError("الكوبون غير موجود", statusCodes.NOT_FOUND));
  }

  if (!coupon.isActive) {
    return next(new ApiError("هذا الكوبون غير نشط", statusCodes.BAD_REQUEST));
  }

  const now = new Date();
  if (now < coupon.startDate) {
    return next(new ApiError("هذا الكوبون لم يبدأ بعد", statusCodes.BAD_REQUEST));
  }

  if (now > coupon.expiryDate) {
    return next(new ApiError("هذا الكوبون منتهي الصلاحية", statusCodes.BAD_REQUEST));
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return next(new ApiError("هذا الكوبون وصل إلى الحد الأقصى للاستخدام", statusCodes.BAD_REQUEST));
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم تطبيق الكوبون بنجاح', {
    data: coupon,
  });
});