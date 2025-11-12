const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required.'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Plan code is required.'],
      unique: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    planType: {
      type: String,
      enum: ['Basic', 'Standard', 'Premium', 'Monthly'],
      required: [true, 'Plan type is required.'],
    },
    options: [
      {
        duration: {
          type: String,
          required: [true, 'Option duration is required.'],
        },
        priceUSD: {
          type: Number,
          required: [true, 'Option price in USD is required.'],
        },
        discountPercent: {
          type: Number,
          default: 0,
        },
        finalPriceUSD: {
          type: Number,
          required: [true, 'Option final price in USD is required.'],
        },
        adsCount: {
          type: Number,
          required: [true, 'Option ads count is required.'],
        },
        categories: [
          {
            type: String,
          },
        ],
      },
    ],
    features: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);