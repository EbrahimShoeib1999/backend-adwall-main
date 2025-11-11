// model/couponModel.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      trim: true,
      required: [true, 'Coupon code required'],
      unique: true,
      uppercase: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Coupon start date required'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Coupon expiry date required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Coupon discount value required'],
      min: [0, 'Discount value cannot be negative'],
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage', 'free_shipping'],
      default: 'fixed',
    },
    maxUses: {
      type: Number,
      default: null, // null = unlimited uses
      validate: {
        validator: function (v) {
          return v === null || v > 0;
        },
        message: 'maxUses must be null or a positive number',
      },
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);