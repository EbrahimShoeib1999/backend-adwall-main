const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription } = require('../controllers/subscriptionController');

const router = express.Router();

// All routes are protected
router.use(authService.protect);

// Create subscription
router.post('/', createSubscription);

module.exports = router;