const asyncHandler = require('express-async-handler');
const User = require('../model/userModel');
const ApiError = require('../utils/apiError');

// Middleware to check if a user's plan includes a specific feature
exports.hasFeature = (feature) => {
  return asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).populate({
      path: 'subscription.plan',
      select: 'features',
    });

    if (!user) {
      return next(new ApiError('User not found.', 404));
    }

    // Check for active subscription and if it has expired
    if (!user.subscription || !user.subscription.isActive || new Date() > user.subscription.endDate) {
      return next(new ApiError('You do not have an active subscription.', 403));
    }

    // Check if the plan's features include the required feature
    const planFeatures = user.subscription.plan.features.map(f => f.toLowerCase());
    if (!planFeatures.includes(feature.toLowerCase())) {
      return next(new ApiError(`Your current plan does not include the '${feature}' feature.`, 403));
    }

    next();
  });
};

// Middleware to check if the user can still create an ad based on their plan's limit
exports.canCreateAd = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate({
    path: 'subscription.plan',
    populate: {
        path: 'options',
    }
  });

  if (!user) {
    return next(new ApiError('User not found.', 404));
  }

  if (!user.subscription || !user.subscription.isActive || new Date() > user.subscription.endDate) {
    return next(new ApiError('You do not have an active subscription to create an ad.', 403));
  }

  const selectedOption = user.subscription.plan.options.find(opt => opt._id.equals(user.subscription.option));

  if (!selectedOption) {
      return next(new ApiError('Could not verify your subscription option details.', 500));
  }

  if (user.subscription.adsUsed >= selectedOption.adsCount) {
    return next(new ApiError('You have reached the maximum number of ads for your current plan.', 403));
  }

  next();
});

// Middleware to increment the ad count after an ad is successfully created
exports.incrementAdCount = asyncHandler(async (req, res, next) => {
    // This should be called *after* the ad is created successfully.
    // We can hook it into the 'create company' or 'create campaign' logic.
    await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'subscription.adsUsed': 1 }
    });
    next();
});
