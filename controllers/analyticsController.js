const Analytics = require('../model/analyticsModel');
const asyncHandler = require('express-async-handler');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');
const ApiFeatures = require('../utils/apiFeatures');

// @desc    Get all analytics records
// @route   GET /api/analytics
// @access  Private (Admin)
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  const apiFeatures = new ApiFeatures(Analytics.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .search()
    .paginate();

  const analytics = await apiFeatures.mongooseQuery;

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب بيانات التحليلات بنجاح', { data: analytics });
});
