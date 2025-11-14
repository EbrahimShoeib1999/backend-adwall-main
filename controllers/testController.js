const asyncHandler = require('express-async-handler');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Test endpoint
// @route   GET /api/v1/test
// @access  Public
exports.testEndpoint = asyncHandler(async (req, res, next) => {
  sendSuccessResponse(res, statusCodes.OK, 'Test endpoint is working!', {
    data: {
      message: 'Hello from the test endpoint!',
      timestamp: new Date(),
    },
  });
});