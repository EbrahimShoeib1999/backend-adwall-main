const asyncHandler = require('express-async-handler');
const Notification = require('../model/notificationModel');
const ApiError = require('../utils/apiError');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

// @desc    Get all notifications for logged-in user
// @route   GET /api/v1/notifications
// @access  Private/Protect
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const { type, userId } = req.query;
  const query = {};

  // Build the query based on parameters
  if (req.user.role === 'admin' && userId) {
    query.user = userId; // Admin can query for a specific user
  } else {
    query.user = req.user._id; // Regular user can only get their own
  }

  if (type) {
    query.type = type;
  }

  const notifications = await Notification.find(query)
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
exports.createNotification = async (req, userId, message, type = 'info', link = null) => {
  try {
    const notification = await Notification.create({
      user: userId,
      message,
      type,
      link,
    });

    // Emit a real-time event to the specific user
    if (req && req.io) {
      // The 'to' method sends the event only to sockets in the specified room.
      // You'll need to have users join a room named after their userId on socket connection.
      // For now, we can emit a general event and let the client-side filter.
      // A better approach is to use rooms: req.io.to(userId.toString()).emit('newNotification', notification);
      req.io.emit(`notification_for_${userId}`, notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Handle error, but don't block the main process
  }
};
