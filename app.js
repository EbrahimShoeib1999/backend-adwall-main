const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');
const mountRoutes = require('./router');

const app = express();

// Allowed origins
const allowedOrigins = [
  "https://adwallpro.com",
  "https://www.adwallpro.com",
  "https://adwallpro.vercel.app",
  "http://localhost:3000",
  "https://localhost:3000"
];

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Body parsers
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

// Analytics Middleware
const analyticsMiddleware = require('./middlewares/analyticsMiddleware');
app.use(analyticsMiddleware);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/v1', mountRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling
app.use(globalError);

module.exports = app;
