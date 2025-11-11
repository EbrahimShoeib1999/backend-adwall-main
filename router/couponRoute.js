// routes/couponRoute.js
const express = require("express");
const {
  getCoupon,
  getCoupons,
  // createCoupon,           ← تم تعطيلها
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  createCouponDirect,        // الجديدة
} = require("../controllers/couponService");
const authService = require("../controllers/authService");

const router = express.Router();

// تطبيق الكوبون (للمستخدمين)
router.post("/apply", authService.protect, applyCoupon);

// حماية جميع المسارات التالية (Admin + Manager)
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/")
  .get(getCoupons)
  .post(createCouponDirect);        // استخدمنا الدالة المباشرة

router.route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;