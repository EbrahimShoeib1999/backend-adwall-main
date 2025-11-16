const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: mongoose.Schema.ObjectId,
      ref: 'Plan',
      required: true,
    },
    option: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan.options',
    },
    remainingAds: {
      type: Number,
      default: 0,
    },
    stripeSubscriptionId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    status: {
      type: String,
      enum: ['active', 'partially_expired', 'expired', 'canceled'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'paid',
    },
    expirationNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);