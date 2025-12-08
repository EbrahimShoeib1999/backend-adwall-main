const express = require('express');
const authService = require('../controllers/authService');
const { createSubscription, getMySubscriptions, adminCreateSubscriptionForUser } = require('../controllers/subscriptionController');

const router = express.Router();

// 🔒 جميع الـ routes محمية - يجب تسجيل الدخول
router.use(authService.protect);

// ✅ User routes - المستخدمون العاديون
router.post('/', createSubscription); // إنشاء اشتراك للمستخدم المسجل
router.get('/my-subscriptions', getMySubscriptions); // جلب اشتراكات المستخدم

// 🔒 Admin only routes - فقط الأدمن
router.post('/admin-create', authService.allowedTo('admin'), adminCreateSubscriptionForUser);

module.exports = router;