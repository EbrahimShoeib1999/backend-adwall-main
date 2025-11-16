const asyncHandler = require('express-async-handler');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');

// Middleware to check if the user can still create an ad based on their plan's limit
exports.canCreateAd = asyncHandler(async (req, res, next) => {
  const subscription = await Subscription.findOne({
    user: req.user._id,
    status: 'active',
  });

  if (!subscription) {
    return next(new ApiError('ليس لديك اشتراك نشط لإنشاء إعلان.', 403));
  }

  if (new Date() > subscription.expiresAt) {
    // Optionally, update status to 'expired'
    subscription.status = 'expired';
    await subscription.save();
    return next(new ApiError('لقد انتهت صلاحية اشتراكك.', 403));
  }

  if (subscription.remainingAds <= 0) {
    return next(new ApiError('لقد استهلكت الحد الأقصى من الإعلانات لباقتك الحالية.', 403));
  }

  next();
});

// Middleware to decrement the ad count after an ad is successfully created
exports.decrementAdCount = asyncHandler(async (req, res, next) => {
    // This should be called *after* the ad is created successfully.
    await Subscription.findOneAndUpdate(
        { user: req.user._id, status: 'active' },
        { $inc: { 'remainingAds': -1 } }
    );
    // We don't need to call next() here if it's the last step after creation.
    // But if it's used as a middleware in the chain, next() is important.
    // For our custom controller, we will call it as a standalone function.
});
