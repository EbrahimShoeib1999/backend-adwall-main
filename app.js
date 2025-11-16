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
app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

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