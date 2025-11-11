const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const Coupon = require('../model/couponModel');

// @desc    Create a checkout session for a one-time plan purchase (with optional coupon)
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { planId, couponCode } = req.body;
  const user = await User.findById(req.user._id);

  if (!planId) {
    return next(new ApiError('Plan ID is required', 400));
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError('Plan not found', 404));
  }

  if (!plan.stripePriceId) {
    return next(new ApiError('This plan is not available for purchase yet.', 400));
  }

  let finalAmount = plan.price;
  let appliedCoupon = null;

  // ==== تطبيق الكوبون إذا وُجد ====
  if (couponCode) {
    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase().trim(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    });

    if (!coupon) {
      return next(new ApiError('Invalid, expired, or inactive coupon code', 400));
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return next(new ApiError('This coupon has reached its maximum usage limit', 400));
    }

    // تطبيق الخصم
    if (coupon.discountType === 'fixed') {
      finalAmount = Math.max(0, plan.price - coupon.discountValue);
    } else if (coupon.discountType === 'percentage') {
      finalAmount = Math.max(0, plan.price * (1 - coupon.discountValue / 100));
    }
    // free_shipping: لا خصم على سعر الباقة (يمكن استخدامه للشحن لاحقًا)

    appliedCoupon = coupon;
  }

  // تحويل المبلغ للسنتات (Stripe يتعامل بالسنت)
  const amountInCents = Math.round(finalAmount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment', // دفعة واحدة (لأنك تبيع باقات لمدة محددة)
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
    // تم حذف client_reference_id تمامًا لأنه هو السبب الرئيسي في المشكلة
    // Stripe لا يسمح بتكرار client_reference_id في mode: 'payment'
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
      couponId: appliedCoupon?._id?.toString() || '',
      originalPrice: plan.price.toString(),
      finalPrice: finalAmount.toString(),
    },
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});

// دالة إنشاء الاشتراك بعد نجاح الدفع
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

  // إنشاء الاشتراك في قاعدة البيانات
  await Subscription.create({
    user: user._id,
    plan: plan._id,
    status: 'active',
    expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000), // حسب عدد الأيام في الباقة
    paymentStatus: 'paid',
  });

  // تحديث عدد استخدامات الكوبون (مرة واحدة فقط هنا، وليس في applyCoupon)
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

// Webhook لاستقبال أحداث Stripe
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

  // يمكن إضافة المزيد من الأحداث لاحقًا (مثل invoice.payment_failed إلخ)

  res.json({ received: true });
});