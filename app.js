const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');

// Routes
const mountRoutes = require('./router');

const app = express();

// Middleware: CORS
const allowedOrigins = [
  "https://adwallpro.com",
  "https://www.adwallpro.com",
  "https://adwallpro.vercel.app",
  "http://localhost:3000",
  "https://localhost:3000"
];

app.use(cors({
  origin: function(origin, callback){
    // السماح بالطلبات بدون origin (مثلاً Postman) أو من الـ whitelist
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // للسماح بالكوكيز و Authorization headers
}));

// Body parsers
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

// Analytics Middleware
const analyticsMiddleware = require('./middlewares/analyticsMiddleware');
app.use(analyticsMiddleware);

// خدمة الملفات الثابتة
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/v1', mountRoutes);

// Route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new ApiError(`TEST: Route ${req.originalUrl} not found on this server!`, 404));
});

// Global error handling middleware
app.use(globalError);

module.exports = app;
