const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      trim: true,
      required: [true, 'Coupon code required'],
      unique: true,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Coupon expiry date required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Coupon discount value required'],
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage', 'free_shipping'],
      default: 'fixed',
    },
    maxUses: {
      type: Number,
      default: 0, // Null means unlimited uses, or set a default number
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);