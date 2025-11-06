const express = require('express');
const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} = require('../controllers/planController');
const authService = require('../controllers/authService');

const router = express.Router();

// Public routes
router.route('/').get(getPlans);
router.route('/:id').get(getPlan);

// Admin only routes
router.use(authService.protect, authService.allowedTo('admin'));

router.route('/').post(createPlan);
router.route('/:id').put(updatePlan).delete(deletePlan);

module.exports = router;