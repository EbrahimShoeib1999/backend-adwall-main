const express = require("express");

const {
  getUserValidator,
  createUserValidator,
  changeUserPasswordValidator,
  updateLoggedUserValidator,
  createAdminValidator,
  updateUserValidator,
  deleteUserValidator,
} = require("../utils/validators/userValidator");

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadUserImage,
  resizeImage,
  changeUserPassword,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  getUsersStats,
  createAdmin,
  assignPlanToUser,
  getUserAnalytics,
} = require("../controllers/userService");

const authService = require("../controllers/authService");

const router = express.Router();

// === جميع الـ Routes محتاجة تسجيل دخول ===
router.use(authService.protect);

// ╔══════════════════════════════════════════════════╗
// ║                Logged User Routes                ║
// ╚══════════════════════════════════════════════════╝

router.get("/getMe", getLoggedUserData, getUser);
router.put("/changeMyPassword", updateLoggedUserPassword);
router.put("/updateMe", uploadUserImage, resizeImage, updateLoggedUserValidator, updateLoggedUserData);
router.delete("/deleteMe", deleteLoggedUserData);

// User Analytics
router.get("/my-analytics", getUserAnalytics);

// ╔══════════════════════════════════════════════════╗
// ║                   Admin Routes                   ║
// ╚══════════════════════════════════════════════════╝

// إحصائيات المستخدمين
router.get("/stats", authService.allowedTo("admin"), getUsersStats);

// إنشاء أدمن جديد
router.post(
  "/admins",
  authService.allowedTo("admin"),
  uploadUserImage,
  resizeImage,
  createAdminValidator,
  createAdmin,
  createUser
);

// تغيير كلمة مرور مستخدم
router.put(
  "/changePassword/:id",
  authService.allowedTo("admin"),
  changeUserPasswordValidator,
  changeUserPassword
);

// Assign plan to user
router.post(
  "/:userId/assign-plan",
  authService.allowedTo("admin"),
  assignPlanToUser
);

// CRUD للمستخدمين
router
  .route("/")
  .get(authService.allowedTo("admin"), getUsers)
  .post(
    authService.allowedTo("admin"),
    uploadUserImage,
    resizeImage,
    createUserValidator,
    createUser
  );

router
  .route("/:id")
  .get(authService.allowedTo("admin"), getUserValidator, getUser)
  .put(
    authService.allowedTo("admin"),
    uploadUserImage,
    resizeImage,
    updateUserValidator,
    updateUser
  )
  .delete(
    authService.allowedTo("admin"), 
    deleteUserValidator, 
    deleteUser
  );

module.exports = router;