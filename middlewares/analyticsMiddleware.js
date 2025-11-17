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
      user: user ? user._id : null,
      role: user ? user.role : null,
      action,
      path: originalUrl,
      method,
      status: statusCode,
      ip,
    };

    createAnalyticsRecord(analyticsData).catch(err => {
      console.error('Failed to save analytics data:', err);
    });
  });

  next();
};

module.exports = analyticsMiddleware;
