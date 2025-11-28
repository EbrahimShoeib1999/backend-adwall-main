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
// Create a temporary HTTP server for redirection
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
});
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
// Note: You need to generate your own SSL certificate and key.
// You can use a tool like OpenSSL to generate a self-signed certificate for development.
// For production, you should use a certificate from a trusted Certificate Authority (CA).
//
// Example using OpenSSL to generate a self-signed certificate:
// openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
//
// Once you have the key and certificate, place them in the 'config' directory.
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'config', 'cert.pem'))
  };
} catch (error) {
  console.error("SSL certificate files not found. Please generate them and place them in the 'config' directory.");
  console.error("To generate a self-signed certificate for development, run the following command:");
  console.error("openssl req -x509 -newkey rsa:2048 -keyout ./config/key.pem -out ./config/cert.pem -days 365 -nodes -subj \"/C=US/ST=California/L=San Francisco/O=MyCompany/OU=MyOrg/CN=www.adwallpro.com\"");
  // process.exit(1); // Exit if SSL certificates are not found
}


// ========================================
// Start Server
// ========================================
(async () => {
  let server;
  if (sslOptions) {
    server = https.createServer(sslOptions, app);
  } else {
    console.warn("Starting server with HTTP because SSL certificates were not found.");
    server = http.createServer(app);
  }


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

    const PORT = process.env.PORT || 8000;
    const HTTP_PORT = 80; // Port for HTTP redirection

    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
      const protocol = sslOptions ? 'https' : 'http';
      console.log(`App running on ${protocol}://www.adwallpro.com:${PORT}`);
      console.log(`Internal URL: ${protocol}://0.0.0.0:${PORT}`);
    });
    
    // Start the HTTP redirection server
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`HTTP redirection server running on port ${HTTP_PORT}`);
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
