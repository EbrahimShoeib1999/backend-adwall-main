const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // roles ==> ['admin', 'manager']
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403)
      );
    }
    next();
  });
