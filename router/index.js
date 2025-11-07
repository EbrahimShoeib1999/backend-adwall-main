const express = require('express');
const categoryRoute = require("./categoryRoute");
const companiesRoute = require("./companyRoute");
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const couponRoute = require("./couponRoute");
const reviewRoute = require("./reviewRoute");
const planRoute = require("./planRoute");
const sitemapRoute = require("./sitemapRoute");
const campaignRoute = require("./campaignRoute");
const miaRoute = require("./miaRoute");

const router = express.Router();

router.use("/categories", categoryRoute);
router.use("/users", userRoute);
router.use("/auth", authRoute);
router.use("/companies", companiesRoute);
router.use("/coupons", couponRoute);
router.use("/reviews", reviewRoute);
router.use("/plans", planRoute);
router.use("/campaigns", campaignRoute);
router.use("/mias", miaRoute);
router.use("/", sitemapRoute);

module.exports = router;
