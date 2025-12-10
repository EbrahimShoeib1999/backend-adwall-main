// paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const Coupon = require('../model/couponModel');
const sendEmail = require('../utils/sendEmail');
const { createNotification } = require('./notificationController');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Create a checkout session for a one-time plan purchase (with optional coupon)
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { planId, optionId, couponCode } = req.body; // ✅ إضافة optionId
  const user = await User.findById(req.user._id);

  if (!planId || !optionId) { // ✅ التحقق من optionId
    return next(new ApiError('معرف الباقة والخيار مطلوبان', statusCodes.BAD_REQUEST));
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError('الباقة غير موجودة', statusCodes.NOT_FOUND));
  }

  // ✅ الحصول على الخيار المحدد
  const selectedOption = plan.options.id(optionId);
  if (!selectedOption) {
    return next(new ApiError('الخيار غير موجود', statusCodes.NOT_FOUND));
  }

  let finalAmount = selectedOption.finalPriceUSD; // ✅ استخدام سعر الخيار المحدد
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase().trim(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    });

    if (!coupon) {
      return next(new ApiError('كود الكوبون غير صالح أو منتهي الصلاحية', statusCodes.BAD_REQUEST));
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return next(new ApiError('هذا الكوبون وصل إلى الحد الأقصى للاستخدام', statusCodes.BAD_REQUEST));
    }

    if (coupon.discountType === 'fixed') {
      finalAmount = Math.max(0, selectedOption.finalPriceUSD - coupon.discountValue); // ✅ استخدام سعر الخيار
    } else if (coupon.discountType === 'percentage') {
      finalAmount = Math.max(0, selectedOption.finalPriceUSD * (1 - coupon.discountValue / 100)); // ✅ استخدام سعر الخيار
    }

    appliedCoupon = coupon;
  }

  // BYPASS STRIPE: Activate subscription immediately for free
  const mockSession = {
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
      optionId: selectedOption._id.toString(),
      couponId: appliedCoupon?._id?.toString() || '',
    }
  };

  await createSubscriptionAndNotify(mockSession, null);

  sendSuccessResponse(res, statusCodes.OK, 'تم تفعيل الاشتراك مجاناً بنجاح', {
    session: {
      id: 'free_pass_' + Date.now(),
      url: `${process.env.FRONTEND_URL}/payment-success?session_id=free_pass`
    },
  });
});

const createSubscriptionAndNotify = async (session, req) => {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const optionId = session.metadata.optionId; // ✅ إضافة optionId
  const couponId = session.metadata.couponId || null;

  const plan = await Plan.findById(planId);
  const user = await User.findById(userId);

  if (!plan || !user) {
    console.error('Plan or User not found during subscription creation');
    return;
  }

  // ✅ الحصول على الخيار المحدد
  const selectedOption = plan.options.id(optionId);
  if (!selectedOption) {
    console.error('Selected option not found during subscription creation');
    return;
  }

  // ✅ حساب تاريخ الانتهاء بناءً على duration
  const durationMatch = selectedOption.duration.match(/(\d+)\s*(month|year|day)/i);
  let expiresAt;
  
  if (durationMatch) {
    const [, value, unit] = durationMatch;
    const now = new Date();
    expiresAt = new Date(now);

    if (unit.toLowerCase().startsWith('month')) {
      expiresAt.setMonth(expiresAt.getMonth() + parseInt(value));
    } else if (unit.toLowerCase().startsWith('year')) {
      expiresAt.setFullYear(expiresAt.getFullYear() + parseInt(value));
    } else if (unit.toLowerCase().startsWith('day')) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(value));
    }
  } else {
    // إذا لم يتم العثور على الصيغة، استخدم 30 يوم كافتراضي
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  await Subscription.create({
    user: user._id,
    plan: plan._id,
    option: optionId, // ✅ إضافة option
    status: 'active',
    expiresAt,
    paymentStatus: 'paid',
  });

  // Notify user and admins
  // Notify user
  createNotification(null, user._id, `تم تفعيل اشتراكك في باقة "${plan.name}" بنجاح بعد الدفع.`, 'success', '/my-subscriptions');
  // Notify admins
  const admins = await User.find({ role: 'admin' });
  admins.forEach(admin => {
    createNotification(null, admin._id, `المستخدم ${user.name} دفع واشترك في باقة "${plan.name}".`, 'info', `/users/${user._id}`);
  });

  // Send activation email
  try {
    const message = `Hi ${user.name},\n\nYour subscription to the "${plan.name}" plan has been successfully activated!\n\nYour plan is valid until: ${expiresAt.toLocaleDateString()}.\n\nThanks,\nThe AddWall Team`;
    await sendEmail({
      email: user.email,
      subject: 'Your Plan has been Activated!',
      message,
    });
  } catch (err) {
    console.error(`Failed to send plan activation email to ${user.email}:`, err);
  }

  if (couponId) {
    const coupon = await Coupon.findById(couponId);
    if (coupon) {
      coupon.usedCount += 1;
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        coupon.isActive = false;
      }
      await coupon.save();
    }
  }
};

exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Pass null as req, createNotification will handle socket internally
    await createSubscriptionAndNotify(session, null);
  }

  res.json({ received: true });
});