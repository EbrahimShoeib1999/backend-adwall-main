// controllers/couponService.js
const factory = require('./handlersFactory');
const Coupon = require('../model/couponModel');
const ApiError = require('../utils/apiError');

exports.getCoupons = factory.getAll(Coupon);
exports.getCoupon = factory.getOne(Coupon);
exports.createCoupon = factory.createOne(Coupon);
exports.updateCoupon = factory.updateOne(Coupon);
exports.deleteCoupon = factory.deleteOne(Coupon);

exports.applyCoupon = async (req, res, next) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    return next(new ApiError('Coupon code is required', 400));
  }

  const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });

  if (!coupon) {
    return next(new ApiError('Invalid or unknown coupon code', 404));
  }

  if (!coupon.isActive) {
    return next(new ApiError('This coupon is no longer active', 400));
  }

  if (coupon.expiryDate < new Date()) {
    coupon.isActive = false;
    await coupon.save();
    return next(new ApiError('This coupon has expired', 400));
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    coupon.isActive = false;
    await coupon.save();
    return next(new ApiError('This coupon has reached its maximum usage limit', 400));
  }

  // زيادة العد
  coupon.usedCount += 1;
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    coupon.isActive = false;
  }
  await coupon.save();

  res.status(200).json({
    status: 'success',
    message: 'Coupon applied successfully',
    data: {
      discountValue: coupon.discountValue,
      discountType: coupon.discountType,
      remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
    },
  });
};