// reviewController.js
const asyncHandler = require('express-async-handler');
const Review = require('../model/reviewModel');
const factory = require('./handlersFactory');
const ApiError = require('../utils/apiError');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');
const User = require('../model/userModel');
const { createNotification } = require('./notificationController');

exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.companyId) {
    filterObject = { company: req.params.companyId, approved: true };
  }
  req.filterObj = filterObject;
  next();
};

// @desc    Create a new review
// @route   POST /api/v1/companies/:companyId/reviews
// @access  Private/Protect/User
exports.createReview = asyncHandler(async (req, res, next) => {
  if (!req.body.company) req.body.company = req.params.companyId;
  if (!req.body.user) req.body.user = req.user._id;

  const newReview = await Review.create(req.body);

  // Notify admins about the new review awaiting approval
  const admins = await User.find({ role: 'admin' });
  admins.forEach(admin => {
    createNotification(
      req, admin._id, `تقييم جديد في انتظار المراجعة من قبل ${req.user.name}.`, 'warning', `/reviews`
    );
  });

  sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء التقييم بنجاح', {
    data: newReview,
  });
});

// @desc    Get all reviews
// @route   GET /api/v1/reviews
// @access  Private/Admin
exports.getReviews = factory.getAll(Review);

// @desc    Get a specific review
// @route   GET /api/v1/reviews/:id
// @access  Private/Admin
exports.getReview = factory.getOne(Review);

// @desc    Delete a specific review
// @route   DELETE /api/v1/reviews/:id
// @access  Private/Admin
exports.deleteReview = factory.deleteOne(Review);

// @desc    Approve a specific review
// @route   PATCH /api/v1/reviews/:id/approve
// @access  Private/Admin
exports.approveReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const review = await Review.findById(id).populate('user').populate('company');

  if (!review) {
    return next(new ApiError(`لا يوجد تقييم بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  review.approved = true;
  await review.save();

  // Notify the company owner that a new review has been approved for their company
  if (review.company && review.company.userId) {
    createNotification(
      req, review.company.userId, `تمت الموافقة على تقييم جديد على شركتك "${review.company.companyName}".`, 'info', `/company/${review.company._id}`
    );
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم الموافقة على التقييم بنجاح', {
    data: review,
  });
});