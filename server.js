require('./generatePostmanCollection.js');
const path = require("path");
const fs = require("fs");

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const passport = require("passport");


// Load environment variables from env.txt if it exists, otherwise from .env
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
require("dotenv").config({ path: envPath });


const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const dbConnection = require("./config/database");
const mainRouter = require("./router"); // Import the main router
const { stripeWebhook } = require('./controllers/paymentController');

// Passport config
require('./config/passport');

// Connect with db
dbConnection();

// express app
const app = express();

// Enable other domains to access your application
app.use(cors());
app.options("*", cors());

// compress all responses
app.use(compression());

// Stripe webhook - Must be before express.json()
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads")));

// Passport middleware
app.use(passport.initialize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// Mount All Routes
app.use((req, res, next) => {
  req.url = req.url.replace(/\/$/, '').replace(/%0A/g, '');
  next();
});
app.use("/api/v1", mainRouter);

// Error Handling
app.all("*", (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 400));
});

// Global error handling middleware for express
app.use(globalError);

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

// Handle rejection outside express
process.on("unhandledRejection", (err) => {
  console.error(`UnhandledRejection Errors: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down....`);
    process.exit(1);
  });
});