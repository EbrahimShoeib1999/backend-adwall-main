const express = require('express');
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, allowedTo } = require('../controllers/authService');

const router = express.Router();

router.use(protect, allowedTo('admin'));

router.route('/').get(getAnalytics);

module.exports = router;
