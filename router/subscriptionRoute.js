const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription, getMySubscriptions } = require('../controllers/subscriptionController'); // Add getMySubscriptions

const router = express.Router();

// All routes are protected
router.use(authService.protect);

// Create subscription
router.post('/', createSubscription);

// Get my subscriptions
router.get('/my-subscriptions', getMySubscriptions); // Add this line

module.exports = router;