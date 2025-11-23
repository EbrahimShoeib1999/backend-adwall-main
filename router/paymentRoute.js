const express = require('express');
const { createCheckoutSession, stripeWebhook } = require('../controllers/paymentController');
const authService = require('../controllers/authService');

const router = express.Router();

// Webhook must be before express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected routes
router.post('/create-checkout-session', authService.protect, authService.allowedTo('admin'), createCheckoutSession);

module.exports = router;