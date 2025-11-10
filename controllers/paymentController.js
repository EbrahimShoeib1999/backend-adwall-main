const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');
const Coupon = require('../model/couponModel');

// @desc    Create a checkout session for a subscription
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { planId, couponCode } = req.body;
  const user = await User.findById(req.user._id);

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError('Plan not found', 404));
  }

  if (!plan.stripePriceId) {
    return next(new ApiError('Stripe Price ID is not configured for this plan.', 500));
  }

  let amountTotal = plan.price;
  let couponId = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return next(new ApiError('Coupon not found', 404));
    }

    if (!coupon.isActive) {
      return next(new ApiError('Coupon is not active', 400));
    }

    if (coupon.expiryDate < new Date()) {
      return next(new ApiError('Coupon has expired', 400));
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return next(new ApiError('Coupon has reached its maximum uses', 400));
    }

    if (coupon.discountType === 'fixed') {
      amountTotal = Math.max(0, plan.price - coupon.discountValue);
    } else if (coupon.discountType === 'percentage') {
      amountTotal = Math.max(0, plan.price * (1 - coupon.discountValue / 100));
    } else if (coupon.discountType === 'free_shipping') {
      // For free shipping, we assume the plan price doesn't include shipping
      // and this coupon type might be handled differently or not applicable to plans.
      // For now, we'll treat it as no discount on the plan price itself.
      // If shipping is a separate line item, it would be handled there.
      // For simplicity, if free_shipping is applied to a plan, it means no price discount.
      amountTotal = plan.price;
    }
    couponId = coupon._id;
  }

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: plan.name,
        },
        unit_amount: amountTotal * 100, // Stripe expects amount in cents
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment', // Changed to 'payment' for one-time plan purchase with coupon
    success_url: `${process.env.FRONTEND_URL}/payment-success`,
    cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    customer_email: user.email,
    client_reference_id: plan.id,
    metadata: {
      userId: user._id.toString(),
      planId: plan.id,
      ...(couponId && { couponId: couponId.toString() }),
    },
  });

  res.status(200).json({ status: 'success', session });
});

const createSubscription = async (session) => {
    const plan = await Plan.findById(session.metadata.planId);
    const user = await User.findById(session.metadata.userId);

    // If the session was for a one-time payment, there won't be a Stripe subscription ID directly.
    // We are creating our internal subscription record.
    await Subscription.create({
      user: user._id,
      plan: plan._id,
      // stripeSubscriptionId: session.subscription, // This might not be present for 'payment' mode
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Example: 30 days from now
    });

    // Handle coupon usage
    if (session.metadata.couponId) {
      const coupon = await Coupon.findById(session.metadata.couponId);
      if (coupon) {
        coupon.usedCount += 1;
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          coupon.isActive = false;
        }
        await coupon.save();
      }
    }
};

const renewSubscription = async (invoice) => {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
        subscription.status = 'active';
        subscription.expiresAt = new Date(
            stripeSubscription.current_period_end * 1000
        );
        await subscription.save();
    }
};

// @desc    Stripe webhook to handle subscription events
// @route   POST /api/v1/payments/webhook
// @access  Public (secured by Stripe signature)
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await createSubscription(event.data.object);
  } else if (event.type === 'invoice.payment_succeeded') {
    await renewSubscription(event.data.object);
  }

  res.status(200).json({ received: true });
});