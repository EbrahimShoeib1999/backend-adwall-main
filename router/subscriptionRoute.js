const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription } = require('../controllers/subscriptionController');

const router = express.Router();

// All routes below are protected
router.use(authService.protect);

// Route for a user to create a subscription (i.e., subscribe to a plan)
router.post('/', createSubscription);

module.exports = router;
