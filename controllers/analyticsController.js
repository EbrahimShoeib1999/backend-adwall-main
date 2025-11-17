const Analytics = require('../model/analyticsModel');
const User = require('../model/userModel');
const Company = require('../model/companyModel');
const Category = require('../model/categoryModel');
const Subscription = require('../model/subscriptionModel');
const asyncHandler = require('express-async-handler');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// Helper to map action to a descriptive name
const getActionName = (method, path) => {
  if (method === 'POST' && path.startsWith('/api/v1/auth/signup')) return 'User Signup';
  if (method === 'POST' && path.startsWith('/api/v1/auth/login')) return 'User Login';
  if (method === 'POST' && path.startsWith('/api/v1/reviews')) return 'New Review';
  if (method === 'POST' && path.startsWith('/api/v1/companies')) return 'Company Submission';
  if (method === 'PUT' && path.startsWith('/api/v1/companies')) return 'Company Update';
  if (method === 'DELETE' && path.startsWith('/api/v1/companies')) return 'Company Deletion';
  if (method === 'POST' && path.startsWith('/api/v1/campaigns')) return 'New Campaign';
  if (method === 'POST' && path.startsWith('/api/v1/subscriptions/subscribe')) return 'New Subscription';
  if (method === 'POST' && path.startsWith('/api/v1/categories')) return 'Create Category'; // Added for user request

  // Generic fallback: extract last part of the path and capitalize
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  }
  return path; // ultimate fallback
};


// @desc    Get all analytics records
// @route   GET /api/v1/analytics
// @access  Private (Admin)
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  // 1. Fetch all counts in parallel
  const [
    userCount,
    adminCount,
    activeCompaniesCount,
    pendingCompaniesCount,
    categoryCount,
    activeSubscriptions,
    rawLatestActivities,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'admin' }),
    Company.countDocuments({ status: 'approved' }),
    Company.countDocuments({ status: 'pending' }),
    Category.countDocuments(),
    Subscription.find({ status: 'active' }).populate('plan', 'name'),
    Analytics.find({ method: { $ne: 'GET' } }) // Exclude GET requests from latest activities
      .sort({ timestamp: -1 })
      .limit(50) // Increased limit to get more raw activities for uniqueness
      .lean(),
  ]);

  // 2. Process data for charts
  const subscriptionsPerPlan = activeSubscriptions.reduce((acc, sub) => {
    const planName = sub.plan ? sub.plan.name : 'Unknown Plan';
    acc[planName] = (acc[planName] || 0) + 1;
    return acc;
  }, {});

  const subscriptionChartData = {
    labels: Object.keys(subscriptionsPerPlan),
    datasets: [{
      label: 'Subscriptions per Plan',
      data: Object.values(subscriptionsPerPlan),
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(255, 159, 64, 0.2)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  };

  const processedActivities = rawLatestActivities.map(activity => ({
    ...activity,
    action: getActionName(activity.method, activity.path)
  }));

  const uniqueActions = new Set();
  const latestActivities = [];
  for (const activity of processedActivities) {
    if (!uniqueActions.has(activity.action)) {
      uniqueActions.add(activity.action);
      latestActivities.push(activity);
    }
    if (latestActivities.length >= 3) {
      break;
    }
  }


  // 3. Structure the final response
  sendSuccessResponse(res, statusCodes.OK, 'تم جلب بيانات التحليلات بنجاح', {
    data: {
      userCount,
      adminCount,
      companies: {
        active: activeCompaniesCount,
        pending: pendingCompaniesCount,
      },
      categoryCount,
      latestActivities,
      charts: {
        subscriptionsPerPlan: subscriptionChartData,
      },
    },
  });
});
