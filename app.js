const express = require('express');
const path = require('path');
const axios = require('axios');
const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');
const mountRoutes = require('./router');

const app = express();

// =======================
// 1️⃣ CORS Middleware
// =======================
const allowedOrigins = [
  "https://adwallpro.com",
  "https://www.adwallpro.com",
  "https://adwallpro.vercel.app",
  "http://localhost:3000",
  "https://localhost:3000"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// =======================
// 2️⃣ Body parsers
// =======================
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

// =======================
// 3️⃣ Analytics Middleware
// =======================
const analyticsMiddleware = require('./middlewares/analyticsMiddleware');
app.use(analyticsMiddleware);

// =======================
// 4️⃣ Static files
// =======================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =======================
// 5️⃣ Proxy for all /api/v1 requests to backend
// =======================
const BACKEND_URL = "http://72.60.178.180:8000";

app.use('/api/v1/*', async (req, res, next) => {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: { ...req.headers, host: undefined } // حذف host الأصلي
    });

    // أضف headers CORS في الرد
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    res.status(response.status).send(response.data);
  } catch (err) {
    next(err);
  }
});

// =======================
// 6️⃣ Health check
// =======================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// =======================
// 7️⃣ Handle unhandled routes
// =======================
app.all('*', (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// =======================
// 8️⃣ Global error handling
// =======================
app.use(globalError);

module.exports = app;
