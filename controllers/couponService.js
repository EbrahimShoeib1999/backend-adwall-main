// controllers/couponService.js
const factory = require('./handlersFactory');
const Coupon = require('../model/couponModel');
const ApiError = require('../utils/apiError');

exports.getCoupons = factory.getAll(Coupon);
exports.getCoupon = factory.getOne(Coupon);
exports.createCoupon = factory.createOne(Coupon);
exports.updateCoupon = factory.updateOne(Coupon);
exports.deleteCoupon = factory.deleteOne(Coupon);