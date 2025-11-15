// paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const Coupon = require('../model/couponModel');
const sendEmail = require('../utils/sendEmail');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Create a checkout session for a one-time plan purchase (with optional coupon)
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { planId, couponCode } = req.body;
  const user = await User.findById(req.user._id);

  if (!planId) {
    return next(new ApiError('معرف الباقة مطلوب', statusCodes.BAD_REQUEST));
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError('الباقة غير موجودة', statusCodes.NOT_FOUND));
  }

  if (!plan.stripePriceId) {
    return next(new ApiError('هذه الباقة غير متاحة للشراء حالياً', statusCodes.BAD_REQUEST));
  }

  let finalAmount = plan.price;
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
      finalAmount = Math.max(0, plan.price - coupon.discountValue);
    } else if (coupon.discountType === 'percentage') {
      finalAmount = Math.max(0, plan.price * (1 - coupon.discountValue / 100));
    }

    appliedCoupon = coupon;
  }

  const amountInCents = Math.round(finalAmount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            metadata: {
              planId: plan._id.toString(),
            },
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    customer_email: user.email,
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
      couponId: appliedCoupon?._id?.toString() || '',
      originalPrice: plan.price.toString(),
      finalPrice: finalAmount.toString(),
    },
  });

  sendSuccessResponse(res, statusCodes.OK, 'تم إنشاء جلسة الدفع بنجاح', {
    session,
  });
});

const createSubscription = async (session) => {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const couponId = session.metadata.couponId || null;

  const plan = await Plan.findById(planId);
  const user = await User.findById(userId);

  if (!plan || !user) {
    console.error('Plan or User not found during subscription creation');
    return;
  }

  const expiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);

  await Subscription.create({
    user: user._id,
    plan: plan._id,
    status: 'active',
    expiresAt,
    paymentStatus: 'paid',
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
    await createSubscription(session);
  }

  res.json({ received: true });
});