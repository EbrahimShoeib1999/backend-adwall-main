const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription, getMySubscriptions, adminCreateSubscriptionForUser } = require('../controllers/subscriptionController');

const router = express.Router();

// All routes are protected and admin-only
router.use(authService.protect, authService.allowedTo('admin'));

// Route for admin to create a subscription for a user
router.post('/admin-create', adminCreateSubscriptionForUser);

// Create subscription for the logged-in user
router.post('/', createSubscription);

// Get my subscriptions
router.get('/my-subscriptions', getMySubscriptions);

module.exports = router;