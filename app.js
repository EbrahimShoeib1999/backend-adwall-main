const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');

// Routes

const mountRoutes = require('./routers');

const app = express();

// Middlewares
app.use(cors({
  origin: [
    "http://adwallpro.com",
    "https://adwallpro.com",
    "http://www.adwallpro.com",
    "https://www.adwallpro.com",
    "http://localhost:3000",
    "https://localhost:3000"
  ],
}));
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
  res.status(200).json({ message: 'Server is running successfully' });
});

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalError);

module.exports = app;