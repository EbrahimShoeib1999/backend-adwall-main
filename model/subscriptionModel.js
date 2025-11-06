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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);