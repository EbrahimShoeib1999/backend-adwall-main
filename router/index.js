const express = require('express');
const categoryRoute = require("./categoryRoute");
const companyRoute = require("./companyRoute");
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const couponRoute = require("./couponRoute");
const reviewRoute = require("./reviewRoute");
const planRoute = require("./planRoute");
const sitemapRoute = require("./sitemapRoute");
const campaignRoute = require("./campaignRoute");
const miaRoute = require("./miaRoute");
const paymentRoute = require("./paymentRoute");
const subscriptionRoute = require('./subscriptionRoute');
const analyticsRoute = require('./analyticsRoute');

const router = express.Router();

router.use("/categories", categoryRoute);
router.use("/companies", companyRoute);
router.use("/users", userRoute);
router.use("/auth", authRoute);
router.use("/coupons", couponRoute);
router.use("/reviews", reviewRoute);
router.use("/plans", planRoute);
router.use("/campaigns", campaignRoute);
router.use("/mias", miaRoute);
router.use("/payments", paymentRoute);
router.use('/subscriptions', subscriptionRoute);
router.use('/analytics', analyticsRoute);
router.use("/", sitemapRoute);

module.exports = router;