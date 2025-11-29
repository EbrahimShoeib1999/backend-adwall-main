// server.js - Final Version for VPS Deployment

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
const http = require("http");
const { Server } = require('socket.io');
const app = require("./app");
require('./generatePostmanCollection.js');
const morgan = require("morgan");
const compression = require("compression");
const passport = require("passport");
const dbConnection = require("./config/database");
const { stripeWebhook } = require('./controllers/paymentController');
const ensureAdminUser = require('./utils/seedAdmin');
const { startExpirationNotifier } = require('./jobs/expirationNotifier');

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
// Start HTTP Server ONLY (SSL handled by Nginx)
// ========================================
(async () => {
  const httpServer = http.createServer(app);

  // Setup Socket.IO
  const io = require('./utils/socket').init(httpServer);
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  try {
    await ensureAdminUser();
    startExpirationNotifier();

    const PORT = process.env.PORT || 8000;

    const serverInstance = httpServer.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 API running on port ${PORT} (HTTP, behind NGINX SSL)`);
    });

    process.on("unhandledRejection", (err) => {
      console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
      serverInstance.close(() => process.exit(1));
    });

    process.on("uncaughtException", (err) => {
      console.error(`UncaughtException: ${err.name} | ${err.message}`);
      serverInstance.close(() => process.exit(1));
    });

  } catch (err) {
    console.error("Error during server startup:", err);
    process.exit(1);
  }
})();
