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

// أي مستخدم مسجل دخول يقدر يطبّق كوبون
router.post("/apply", authService.protect, applyCoupon);

// باقي المسارات للـ admin و manager فقط
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/")
  .get(getCoupons)
  .post(createCoupon);

router.route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;