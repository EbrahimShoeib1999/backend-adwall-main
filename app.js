const express = require('express');
const path = require('path');
const cors = require('cors');
const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');
const mountRoutes = require('./router');

const app = express();

// =======================
// 1️⃣ CORS Middleware (Enhanced for Nginx)
// =======================
const allowedOrigins = [
  "https://adwallpro.com",
  "https://www.adwallpro.com",
  "https://adwallpro.vercel.app",
  "http://localhost:3000",
  "https://localhost:3000"
];

// Manual CORS headers (works even behind Nginx)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Also use cors package as backup
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

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
// 5️⃣ Mount routes
// =======================
app.use('/api/v1', mountRoutes);

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