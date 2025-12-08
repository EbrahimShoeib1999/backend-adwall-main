// subscriptionController.js
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const { createNotification } = require('./notificationController');
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

  // ✅ حساب تاريخ الانتهاء بناءً على duration
  const durationMatch = selectedOption.duration.match(/(\d+)\s*(month|year|day)/i);
  
  if (!durationMatch) {
    return next(new ApiError('صيغة المدة غير صالحة. يجب أن تكون مثل: "3 months" أو "1 year"', statusCodes.BAD_REQUEST));
  }

  const [, value, unit] = durationMatch;
  const now = new Date();
  let endDate = new Date(now);

  if (unit.toLowerCase().startsWith('month')) {
    endDate.setMonth(endDate.getMonth() + parseInt(value));
  } else if (unit.toLowerCase().startsWith('year')) {
    endDate.setFullYear(endDate.getFullYear() + parseInt(value));
  } else if (unit.toLowerCase().startsWith('day')) {
    endDate.setDate(endDate.getDate() + parseInt(value));
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

  // Notify user
  createNotification(req, userId, `لقد اشتركت بنجاح في باقة "${plan.name}".`, 'success', '/my-subscriptions');

  // Notify admins
  const admins = await User.find({ role: 'admin' });
  admins.forEach(admin => {
    createNotification(req, admin._id, `المستخدم ${user.name} اشترك في باقة "${plan.name}".`, 'info', `/users/${userId}`);
  });


  sendSuccessResponse(res, statusCodes.CREATED, 'تم الاشتراك في الباقة بنجاح', {
    data: {
      subscription: newSubscription,
      userSubscriptionDetails: user.subscription,
    },
  });
});

// @desc    Admin create a new subscription for a specific user
// @route   POST /api/v1/subscriptions/admin-create
// @access  Private (Admin)
exports.adminCreateSubscriptionForUser = asyncHandler(async (req, res, next) => {
  const { planId, optionId, userId } = req.body;

  if (!planId || !optionId || !userId) {
    return next(new ApiError('يرجى تقديم معرف المستخدم، معرف الباقة، ومعرف الخيار', statusCodes.BAD_REQUEST));
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
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف: ${userId}`, statusCodes.NOT_FOUND));
  }

  // Cancel any existing active subscription for the user
  await Subscription.findOneAndUpdate(
    { user: userId, status: 'active' },
    { status: 'canceled' }
  );

  // ✅ حساب تاريخ الانتهاء بناءً على duration
  const durationMatch = selectedOption.duration.match(/(\d+)\s*(month|year|day)/i);
  
  if (!durationMatch) {
    return next(new ApiError('صيغة المدة غير صالحة. يجب أن تكون مثل: "3 months" أو "1 year"', statusCodes.BAD_REQUEST));
  }

  const [, value, unit] = durationMatch;
  const now = new Date();
  let endDate = new Date(now);

  if (unit.toLowerCase().startsWith('month')) {
    endDate.setMonth(endDate.getMonth() + parseInt(value));
  } else if (unit.toLowerCase().startsWith('year')) {
    endDate.setFullYear(endDate.getFullYear() + parseInt(value));
  } else if (unit.toLowerCase().startsWith('day')) {
    endDate.setDate(endDate.getDate() + parseInt(value));
  }

  const newSubscription = await Subscription.create({
    user: userId,
    plan: planId,
    option: optionId,
    status: 'active',
    expiresAt: endDate,
    remainingAds: selectedOption.adsCount,
  });

  // Optionally, you can remove the subscription details from the user model
  // to keep it clean and rely on the Subscription model as the single source of truth.
  // For now, we'll clear the old one to avoid confusion.
  user.subscription = {}; 
  await user.save();

  // Notify user
  createNotification(req, userId, `قام المدير بتفعيل اشتراكك في باقة "${plan.name}".`, 'success', '/my-subscriptions');


  // Send notification email to the user
  try {
    await sendEmail({
      email: user.email,
      subject: 'تم تفعيل اشتراكك الجديد!',
      message: `مرحبًا ${user.name},\n\nلقد قام المشرف بتفعيل اشتراك جديد لك.\n\nتفاصيل الباقة:\n- اسم الباقة: ${plan.name}\n- عدد الإعلانات: ${selectedOption.adsCount}\n- تنتهي في: ${endDate.toLocaleDateString()}\n\nيمكنك الآن الاستفادة من مميزات باقتك.\n\nشكرًا لك.`
    });
  } catch (err) {
    // Log the error but don't block the response
    console.error('Failed to send subscription notification email:', err);
  }

  sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء الاشتراك للمستخدم بنجاح', {
    data: newSubscription,
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