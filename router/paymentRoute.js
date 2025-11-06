const express = require('express');
const { createCheckoutSession, stripeWebhook } = require('../controllers/paymentController');
const authService = require('../controllers/authService');

const router = express.Router();

// This webhook must be before express.json(), so we define it before the general middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.post('/create-checkout-session', authService.protect, createCheckoutSession);

module.exports = router;