const categoryRoute = require("./categoryRoute");
const companiesRoute = require("./companyRoute");
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const couponRoute = require("./couponRoute");
const reviewRoute = require("./reviewRoute");
const planRoute = require("./planRoute");
const sitemapRoute = require("./sitemapRoute");

const mountRoutes = (app) => {
  app.use("/api/v1/categories", categoryRoute);
  app.use("/api/v1/users", userRoute);
  app.use("/api/v1/auth", authRoute);
  app.use("/api/v1/companies", companiesRoute);
  app.use("/api/v1/coupons", couponRoute);
  app.use("/api/v1/reviews", reviewRoute);
  app.use("/api/v1/plans", planRoute);

  // Sitemap should be at the root level of api
  app.use("/api/v1", sitemapRoute);
};

module.exports = mountRoutes;
