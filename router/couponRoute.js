// routes/couponRoute.js
const express = require("express");
const {
  getCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  createCouponDirect,     // الدالة السحرية اللي خلّصت كل المشاكل
} = require("../controllers/couponService");
const authService = require("../controllers/authService");

const router = express.Router();

// تطبيق الكوبون (متاح لكل مستخدم مسجل دخول)
router.post("/apply", authService.protect, applyCoupon);

// حماية كل المسارات الإدارية (admin + manager)
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/")
  .get(getCoupons)
  .post(createCouponDirect);   // الحمد لله خلصنا من handlersFactory المعفن هنا

router.route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;