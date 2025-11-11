// controllers/couponService.js
const factory = require('./handlersFactory');
const Coupon = require('../model/couponModel');
const ApiError = require('../utils/apiError');
const asyncHandler = require('express-async-handler');

exports.getCoupons = factory.getAll(Coupon);
exports.getCoupon = factory.getOne(Coupon);
// exports.createCoupon = factory.createOne(Coupon);   ← تم تعطيلها
exports.updateCoupon = factory.updateOne(Coupon);
exports.deleteCoupon = factory.deleteOne(Coupon);

exports.applyCoupon = asyncHandler(async (req, res, next) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    return next(new ApiError('Coupon code is required', 400));
  }

  const coupon = await Coupon.findOne({ 
    couponCode: couponCode.toString().trim().toUpperCase() 
  });

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
});

// إنشاء الكوبون مباشرة بدون المرور بالـ factory المعفن
exports.createCouponDirect = asyncHandler(async (req, res, next) => {
  const { couponCode, expiryDate, discountValue, discountType, maxUses, isActive } = req.body;

  if (!couponCode || !expiryDate || discountValue === undefined) {
    return next(new ApiError('couponCode, expiryDate and discountValue are required', 400));
  }

  const code = couponCode.toString().trim().toUpperCase();

  const existingCoupon = await Coupon.findOne({ couponCode: code });
  if (existingCoupon) {
    return next(new ApiError(`Coupon code '${code}' is already in use`, 400));
  }

  const newCoupon = await Coupon.create({
    couponCode: code,
    expiryDate,
    discountValue: Number(discountValue),
    discountType: discountType || 'fixed',
    maxUses: maxUses === null || maxUses === undefined ? null : Number(maxUses),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({
    status: 'success',
    message: 'Coupon created successfully',
    data: newCoupon,
  });
});