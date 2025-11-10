// routes/couponRoute.js
const express = require("express");
const {
  getCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require("../controllers/couponService");
const authService = require("../controllers/authService");

const router = express.Router();

// تطبيق الكوبون (للمستخدمين)
router.post("/apply", authService.protect, applyCoupon);

// حماية جميع المسارات التالية
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/").get(getCoupons).post(createCoupon);
router.route("/:id").get(getCoupon).put(updateCoupon).delete(deleteCoupon);

module.exports = router;