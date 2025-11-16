const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription, getMySubscriptions, adminCreateSubscriptionForUser } = require('../controllers/subscriptionController');

const router = express.Router();

// All routes are protected
router.use(authService.protect);

// Route for admin to create a subscription for a user
router.post('/admin-create', authService.allowedTo('admin'), adminCreateSubscriptionForUser);

// Create subscription for the logged-in user
router.post('/', createSubscription);

// Get my subscriptions
router.get('/my-subscriptions', getMySubscriptions);

module.exports = router;