const categoryRoute = require("./categoryRoute");
const companiesRoute = require("./companyRoute");
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const couponRoute = require("./couponRoute");

const mountRoutes = (app) => {
  app.use("/api/v1/categories", categoryRoute);
  app.use("/api/v1/users", userRoute);
  app.use("/api/v1/auth", authRoute);
  app.use("/api/v1/companies", companiesRoute);
  app.use("/api/v1/coupons", couponRoute);
};

module.exports = mountRoutes;
