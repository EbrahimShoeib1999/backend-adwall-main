const Analytics = require('../model/analyticsModel');
const User = require('../model/userModel');
const Campaign = require('../model/campaignModel');
const asyncHandler = require('express-async-handler');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Get all analytics records
// @route   GET /api/v1/analytics
// @access  Private (Admin)
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  const range = req.query.range || 'week'; // Default to 'week'
  const days = range === 'month' ? 30 : 7;

  const [
    userCount,
    adminCount,
    managerCount,
    activeCampaignsCount,
    latestActivities,
    dailyCounts,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'manager' }),
    Campaign.countDocuments({ status: 'active' }),
    Analytics.find().sort({ timestamp: -1 }).limit(10),
    Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(new Date() - days * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]),
  ]);

  const chartData = {
    labels: dailyCounts.map(item => item._id),
    data: dailyCounts.map(item => item.count),
  };

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب بيانات التحليلات بنجاح', {
    data: {
      userCount,
      adminCount,
      managerCount,
      activeCampaignsCount,
      latestActivities,
      chartData,
    },
  });
});
