const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('express-async-handler');
const Plan = require('../model/planModel');
const User = require('../model/userModel');
const Subscription = require('../model/subscriptionModel');
const ApiError = require('../utils/apiError');

// @desc    Create a checkout session for a subscription
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { planId } = req.body;
  const user = await User.findById(req.user._id);

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError('Plan not found', 404));
  }

  if (!plan.stripePriceId) {
    return next(new ApiError('Stripe Price ID is not configured for this plan.', 500));
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/payment-success`,
    cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    customer_email: user.email,
    client_reference_id: plan.id,
    metadata: {
      userId: user._id.toString(),
    },
  });

  res.status(200).json({ status: 'success', session });
});

const createSubscription = async (session) => {
    const plan = await Plan.findById(session.client_reference_id);
    const user = await User.findOne({ email: session.customer_email });

    const stripeSubscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    await Subscription.create({
      user: user._id,
      plan: plan._id,
      stripeSubscriptionId: session.subscription,
      status: 'active',
      expiresAt: new Date(
        stripeSubscription.current_period_end * 1000
      ),
    });
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