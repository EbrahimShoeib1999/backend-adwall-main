// subscriptionController.js
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Create a new subscription for the logged-in user
// @route   POST /api/v1/subscriptions
// @access  Private (Logged-in User)
exports.createSubscription = asyncHandler(async (req, res, next) => {
  const { planId, optionId } = req.body;
  const userId = req.user._id;

  if (!planId || !optionId) {
    return next(new ApiError('يرجى تقديم معرف الباقة وخيار الاشتراك', statusCodes.BAD_REQUEST));
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError(`لا توجد باقة بهذا المعرف: ${planId}`, statusCodes.NOT_FOUND));
  }

  const selectedOption = plan.options.find(opt => opt._id.toString() === optionId);
  if (!selectedOption) {
    return next(new ApiError(`لا يوجد خيار بهذا المعرف في هذه الباقة`, statusCodes.NOT_FOUND));
  }

  const user = await User.findById(userId);
  if (user.subscription && user.subscription.isActive) {
    await Subscription.findOneAndUpdate(
      { user: userId, status: 'active' },
      { status: 'canceled' }
    );
  }

  const now = new Date();
  let endDate;
  if (selectedOption.duration.toLowerCase() === 'monthly') {
    endDate = new Date(now.setMonth(now.getMonth() + 1));
  } else if (selectedOption.duration.toLowerCase() === 'yearly') {
    endDate = new Date(now.setFullYear(now.getFullYear() + 1));
  } else {
    return next(new ApiError('مدة الباقة غير صالحة', statusCodes.BAD_REQUEST));
  }

  const newSubscription = await Subscription.create({
    user: userId,
    plan: planId,
    status: 'active',
    expiresAt: endDate,
  });

  user.subscription = {
    plan: planId,
    option: optionId,
    startDate: new Date(),
    endDate: endDate,
    adsUsed: 0,
    isActive: true,
  };
  await user.save();

  sendSuccessResponse(res, statusCodes.CREATED, 'تم الاشتراك في الباقة بنجاح', {
    data: {
      subscription: newSubscription,
      userSubscriptionDetails: user.subscription,
    },
  });
});

// @desc    Get all subscriptions for the logged-in user
// @route   GET /api/v1/subscriptions/my-subscriptions
// @access  Private (Logged-in User)
exports.getMySubscriptions = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const subscriptions = await Subscription.find({ user: userId }).populate('plan');

  sendSuccessResponse(res, statusCodes.OK, 'تم استرجاع الاشتراكات بنجاح', {
    data: subscriptions,
  });
});