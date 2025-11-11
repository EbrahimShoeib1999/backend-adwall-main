const express = require("express");
const {
  getCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  createCoupon,
} = require("../controllers/couponService");
const authService = require("../controllers/authService");
const {
  createCouponValidator,
  applyCouponValidator,
} = require("../utils/validators/couponValidator");

const router = express.Router();

// تطبيق الكوبون (متاح لكل مستخدم مسجل دخول)
router.post(
  "/apply",
  authService.protect,
  applyCouponValidator,
  applyCoupon
);

// حماية كل المسارات الإدارية (admin + manager)
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/").get(getCoupons).post(createCouponValidator, createCoupon);

router
  .route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;