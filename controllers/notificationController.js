const asyncHandler = require('express-async-handler');
const Notification = require('../model/notificationModel');
const ApiError = require('../utils/apiError');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Get all notifications for logged-in user
// @route   GET /api/v1/notifications
// @access  Private/Protect
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort('-createdAt'); // Sort by newest first

  sendSuccessResponse(res, statusCodes.OK, 'Notifications retrieved successfully', {
    results: notifications.length,
    data: notifications,
  });
});

// @desc    Mark a specific notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private/Protect
exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return next(new ApiError('Notification not found or does not belong to user', statusCodes.NOT_FOUND));
  }

  sendSuccessResponse(res, statusCodes.OK, 'Notification marked as read', {
    data: notification,
  });
});

// @desc    Mark all notifications for logged-in user as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private/Protect
exports.markAllNotificationsAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );

  sendSuccessResponse(res, statusCodes.OK, 'All notifications marked as read');
});

// @desc    Delete a specific notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private/Protect
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    return next(new ApiError('Notification not found or does not belong to user', statusCodes.NOT_FOUND));
  }

  sendSuccessResponse(res, statusCodes.NO_CONTENT, 'Notification deleted successfully');
});

// Helper function to create a notification (can be called from other services)
exports.createNotification = async (userId, message, type = 'info', link = null) => {
  try {
    const notification = await Notification.create({
      user: userId,
      message,
      type,
      link,
    });
    // Optionally, you could emit a real-time event here
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Handle error, but don't block the main process
  }
};
