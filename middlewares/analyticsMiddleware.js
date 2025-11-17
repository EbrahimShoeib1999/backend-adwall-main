const { createAnalyticsRecord } = require('../controllers/analyticsService');

const getEventType = (method, url) => {
  if (url.includes('/auth/login')) return 'User Login';
  if (url.includes('/auth/signup')) return 'New Signup';
  if (method === 'POST' && url.endsWith('/companies')) return 'Ad Created';
  if (method === 'PUT' && url.includes('/companies/')) return 'Ad Updated';
  if (method === 'DELETE' && url.includes('/companies/')) return 'Ad Deleted';
  if (url.includes('/subscriptions')) return 'Subscription Change';
  if (url.includes('/reviews')) return 'New Review';
  return 'Other';
};

const analyticsMiddleware = (req, res, next) => {
  const { ip, method, originalUrl } = req;
  const user = req.user;

  res.on('finish', () => {
    const { statusCode } = res;

    // 1. Stop logging analytics requests
    if (originalUrl.startsWith('/api/v1/analytics')) {
      return;
    }

    // 2. Stop logging GET requests to reduce noise
    if (method === 'GET') {
      return;
    }
    
    const action = `${method} ${originalUrl}`;
    const eventType = getEventType(method, originalUrl);

    const analyticsData = {
      action,
      eventType,
      path: originalUrl,
      method,
      status: statusCode,
      ip,
    };

    if (user) {
      analyticsData.user = user._id;
      analyticsData.role = user.role;
      analyticsData.userName = user.name;
    }

    createAnalyticsRecord(analyticsData).catch(err => {
      console.error('Failed to save analytics data:', err);
    });
  });

  next();
};

module.exports = analyticsMiddleware;
