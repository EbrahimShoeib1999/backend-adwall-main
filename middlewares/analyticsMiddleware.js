const { createAnalyticsRecord } = require('../controllers/analyticsService');

const analyticsMiddleware = (req, res, next) => {
  const { ip, method, originalUrl } = req;
  const user = req.user;

  res.on('finish', () => {
    const { statusCode } = res;
    if (originalUrl.startsWith('/api/analytics')) {
      return;
    }
    
    const action = `${method} ${originalUrl}`;

    const analyticsData = {
      action,
      path: originalUrl,
      method,
      status: statusCode,
      ip,
    };

    if (user) {
      analyticsData.user = user._id;
      analyticsData.role = user.role;
    }

    createAnalyticsRecord(analyticsData).catch(err => {
      console.error('Failed to save analytics data:', err);
    });
  });

  next();
};

module.exports = analyticsMiddleware;
