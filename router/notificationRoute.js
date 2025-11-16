const express = require('express');
const { protect } = require('../controllers/authService');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const router = express.Router();

// All notification routes are protected
router.use(protect);

router.route('/')
  .get(getNotifications);

router.route('/read-all')
  .put(markAllNotificationsAsRead);

router.route('/:id')
  .delete(deleteNotification);

router.route('/:id/read')
  .put(markNotificationAsRead);

module.exports = router;
