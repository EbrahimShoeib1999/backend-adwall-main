const app = require("./app");
require('./generatePostmanCollection.js');
const path = require("path");
const fs = require("fs");


const morgan = require("morgan");
const compression = require("compression");
const passport = require("passport");
const express = require("express"); // Keep express import for express.raw

// Load environment variables
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
require("dotenv").config({ path: envPath });

const dbConnection = require("./config/database");
const { stripeWebhook } = require('./controllers/paymentController');
const ensureAdminUser = require('./utils/seedAdmin');

// Passport config
require('./config/passport');

// Connect with db
dbConnection();

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

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

(async () => {
  await ensureAdminUser();

  const PORT = process.env.PORT || 8000;
  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`App running on http://0.0.0.0:${PORT}`);
    console.log(`External URL: http://72.60.178.180:${PORT}`);
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", (err) => {
    console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
    serverInstance.close(() => {
      console.error(`Shutting down....`);
      process.exit(1);
    });
  });
})();