const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
    },
    // Duration in days
    duration: {
      type: Number,
      required: [true, 'Plan duration in days is required'],
    },
    stripePriceId: {
      type: String,
      // This will be required once you integrate Stripe fully
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);