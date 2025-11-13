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

// Apply coupon - protected route for logged in users
router.post("/apply", authService.protect, applyCoupon);

// Admin and manager routes
router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/")
  .get(getCoupons)
  .post(createCoupon);

router.route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;