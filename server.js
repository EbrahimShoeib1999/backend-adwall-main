// server.js - النسخة المعدلة للـ VPS

const path = require("path");
const fs = require("fs");

// ========================================
// Load environment variables FIRST
// ========================================
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
require("dotenv").config({ path: envPath });

// ========================================
// Requires
// ========================================
const express = require("express");
const app = require("./app");
require('./generatePostmanCollection.js');
const morgan = require("morgan");
const compression = require("compression");
const passport = require("passport");
const dbConnection = require("./config/database");
const { stripeWebhook } = require('./controllers/paymentController');
const ensureAdminUser = require('./utils/seedAdmin');

// Passport config
require('./config/passport');

// ========================================
// Connect to Database
// ========================================
dbConnection();

// ========================================
// Middlewares
// ========================================

// Trim whitespace from URL
app.use((req, res, next) => {
  req.url = req.url.trim();
  next();
});

// Compress responses
app.use(compression());

// Stripe webhook (must be before express.json)
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Passport
app.use(passport.initialize());

// Logger (development only)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// ========================================
// Start Server
// ========================================
(async () => {
  try {
    await ensureAdminUser();

    const PORT = process.env.PORT || 8000;
    const serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`App running on ${process.env.BASE_URL || 'http://0.0.0.0:' + PORT}`);
      console.log(`Internal URL: http://0.0.0.0:${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
      serverInstance.close(() => {
        console.error(`Shutting down due to unhandled rejection`);
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error(`UncaughtException: ${err.name} | ${err.message}`);
      serverInstance.close(() => {
        console.error(`Shutting down due to uncaught exception`);
        process.exit(1);
      });
    });

  } catch (err) {
    console.error("Error during server startup:", err);
    process.exit(1);
  }
})();
