// server.js

require('./generatePostmanCollection.js');
const path = require("path");
const fs = require("fs");

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const passport = require("passport");

// Load environment variables
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
require("dotenv").config({ path: envPath });

const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const dbConnection = require("./config/database");
const mainRouter = require("./router");
const { stripeWebhook } = require('./controllers/paymentController');

// Passport config
require('./config/passport');

// Connect with db
dbConnection();

// express app
const app = express();

// Trim whitespace from URL
app.use((req, res, next) => {
  req.url = req.url.trim();
  next();
});

// Enable CORS
app.use(cors());
app.options("*", cors());

// Compress responses
app.use(compression());

// Stripe webhook (must be before express.json)
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: "20kb" }));

// Mount Routes
// TODO: make it dynamic
app.use("/api/v1", mainRouter);

// Serve uploaded files
app.use(express.static(path.join(__dirname, "uploads")));

// Passport
app.use(passport.initialize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// 404 Handler
app.all("*", (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 400));
});

// Global error handler
app.use(globalError);

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down....`);
    process.exit(1);
  });
});