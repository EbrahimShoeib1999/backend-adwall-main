// server.js - النسخة المعدلة للـ VPS

const path = require("path");
const fs = require("fs");

// ========================================
// Load environment variables FIRST
// ========================================
const envPath = fs.existsSync(path.join(__dirname, 'env.txt')) ? 'env.txt' : '.env';
require("dotenv").config({ path: envPath });

const https = require('https');
const http = require('http');

// ========================================
// Requires
// ========================================
const express = require("express");
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
// SSL Configuration
// ========================================
const selfsigned = require('selfsigned');

const configDir = path.join(__dirname, 'config');
const keyPath = path.join(configDir, 'key.pem');
const certPath = path.join(configDir, 'cert.pem');

let sslOptions;

// Check if certificate files exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  // Load existing certificates
  console.log('Loading existing SSL certificates.');
  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
} else {
  // Generate new self-signed certificates
  console.log('SSL certificate files not found. Generating new self-signed certificates...');
  
  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  const attrs = [{ name: 'commonName', value: 'www.adwallpro.com' }];
  const pems = selfsigned.generate(attrs, { days: 365 });

  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  
  console.log('New self-signed SSL certificates have been generated and saved.');
  
  sslOptions = {
    key: pems.private,
    cert: pems.cert
  };
}



// ========================================
// Start Server
// ========================================
(async () => {
  const server = https.createServer(sslOptions, app);

  // Setup Socket.IO
  const io = require('./utils/socket').init(server);
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  try {
    await ensureAdminUser();
    startExpirationNotifier();

    const PORT = process.env.PORT || 443; // Default HTTPS port

    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
      console.log(`App running on https://www.adwallpro.com:${PORT}`);
      console.log(`Internal URL: https://0.0.0.0:${PORT}`);
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
