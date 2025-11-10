const factory = require('./handlersFactory');
const Coupon = require('../model/couponModel');
const ApiError = require('../utils/apiError');

// @desc    Get list of coupons
// @route   GET /api/v1/coupons
// @access  Private/Admin-Manager
exports.getCoupons = factory.getAll(Coupon);

// @desc    Get specific coupon by id
// @route   GET /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.getCoupon = factory.getOne(Coupon);

// @desc    Create coupon
// @route   POST  /api/v1/coupons
// @access  Private/Admin-Manager
exports.createCoupon = factory.createOne(Coupon);

// @desc    Update specific coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.updateCoupon = factory.updateOne(Coupon);

// @desc    Delete specific coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.deleteCoupon = factory.deleteOne(Coupon);

// @desc    Apply coupon
// @route   POST /api/v1/coupons/apply
// @access  Private/User
exports.applyCoupon = async (req, res, next) => {
  const { couponCode } = req.body;

  const coupon = await Coupon.findOne({ couponCode });

  if (!coupon) {
    return next(new ApiError('Coupon not found', 404));
  }

  if (!coupon.isActive) {
    return next(new ApiError('Coupon is no longer active', 400));
  }

  if (coupon.expiryDate < new Date()) {
    return next(new ApiError('Coupon has expired', 400));
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    // If maxUses is reached, deactivate the coupon
    coupon.isActive = false;
    await coupon.save();
    return next(new ApiError('Coupon has reached its maximum usage limit', 400));
  }

  // Increment usedCount and save the coupon
  coupon.usedCount += 1;
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    coupon.isActive = false;
  }
  await coupon.save();

  res.status(200).json({
    status: 'success',
    message: 'Coupon applied successfully',
    coupon,
  });
};
