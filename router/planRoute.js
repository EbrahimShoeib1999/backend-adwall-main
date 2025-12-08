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

// ✅ Public routes - المستخدمون يمكنهم رؤية الباقات
router.route('/').get(getPlans);
router.route('/:id').get(getPlanValidator, getPlan);

// 🔒 Admin only routes - فقط الأدمن يمكنه إنشاء/تعديل/حذف الباقات
router.use(authService.protect, authService.allowedTo('admin'));

router.route('/').post(createPlanValidator, createPlan);
router
  .route('/:id')
  .put(updatePlanValidator, updatePlan)
  .delete(deletePlanValidator, deletePlan);

module.exports = router;