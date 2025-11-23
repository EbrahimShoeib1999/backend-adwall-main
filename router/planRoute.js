const express = require('express');
const {
  getPlanValidator,
  createPlanValidator,
  updatePlanValidator,
  deletePlanValidator,
} = require('../utils/validators/planValidator');

const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} = require('../controllers/planController');
const authService = require('../controllers/authService');

const router = express.Router();

// Admin only routes
router.use(authService.protect, authService.allowedTo('admin'));

// Public routes
router.route('/').get(getPlans);
router.route('/:id').get(getPlanValidator, getPlan);


router.route('/').post(createPlanValidator, createPlan);
router
  .route('/:id')
  .put(updatePlanValidator, updatePlan)
  .delete(deletePlanValidator, deletePlan);

module.exports = router;