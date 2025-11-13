const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');

// @desc    Create a new subscription for the logged-in user
// @route   POST /api/v1/subscriptions
// @access  Private (Logged-in User)
exports.createSubscription = asyncHandler(async (req, res, next) => {
  const { planId, optionId } = req.body;
  const userId = req.user._id;

  if (!planId || !optionId) {
    return next(new ApiError('Please provide a planId and optionId.', 400));
  }

  // 1. Find the selected plan and option
  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError(`No plan found with id: ${planId}`, 404));
  }

  const selectedOption = plan.options.find(opt => opt._id.toString() === optionId);
  if (!selectedOption) {
    return next(new ApiError(`No option found with id: ${optionId} in this plan`, 404));
  }

  // 2. Check if user has an active subscription. For simplicity, we'll override it.
  // In a real-world scenario, you might want to handle this differently (e.g., prorate, or prevent).
  const user = await User.findById(userId);
  if (user.subscription && user.subscription.isActive) {
    // Optional: Invalidate the old subscription in the main Subscription collection
    await Subscription.findOneAndUpdate(
      { user: userId, status: 'active' },
      { status: 'canceled' }
    );
  }

  // 3. Determine the subscription duration
  const now = new Date();
  let endDate;
  if (selectedOption.duration.toLowerCase() === 'monthly') {
    endDate = new Date(now.setMonth(now.getMonth() + 1));
  } else if (selectedOption.duration.toLowerCase() === 'yearly') {
    endDate = new Date(now.setFullYear(now.getFullYear() + 1));
  } else {
      // Handle other durations if necessary
    return next(new ApiError('Invalid plan duration.', 400));
  }

  // 4. Create the new subscription record
  const newSubscription = await Subscription.create({
    user: userId,
    plan: planId,
    status: 'active',
    expiresAt: endDate,
  });

  // 5. Update the user's subscription details
  user.subscription = {
    plan: planId,
    option: optionId,
    startDate: new Date(),
    endDate: endDate,
    adsUsed: 0,
    isActive: true,
  };
  await user.save();

  res.status(201).json({
    status: 'success',
    message: 'Successfully subscribed to the plan.',
    data: {
      subscription: newSubscription,
      userSubscriptionDetails: user.subscription,
    },
  });
});
