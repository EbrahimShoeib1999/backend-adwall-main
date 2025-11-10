const express = require("express");

const {
  getCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon, // Import applyCoupon
} = require("../controllers/couponService");

const authService = require("../controllers/authService");

const router = express.Router();

// Route for applying a coupon (accessible to authenticated users)
router.post("/apply", authService.protect, applyCoupon);

router.use(authService.protect, authService.allowedTo("admin", "manager"));

router.route("/").get(getCoupons).post(createCoupon);
router.route("/:id").get(getCoupon).put(updateCoupon).delete(deleteCoupon);

module.exports = router;
