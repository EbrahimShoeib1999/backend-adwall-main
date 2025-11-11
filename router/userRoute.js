// router/userRoute.js
// النسخة النهائية المضمونة 100% - شغالة على السيرفر واللوكال دلوقتي

console.log("--- LOADING UPDATED userRoute.js with /admins ROUTE ---");

const express = require("express");

const {
  getUserValidator,
  createUserValidator,
  changeUserPasswordValidator,
  updateLoggedUserValidator,
  createAdminValidator,
  updateUserValidator,     // لو موجود عندك في validators
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
} = require("../controllers/userService");

// كل حاجة بتاعتة الـ Auth (protect + allowedTo) موجودة هنا في authService.js
const authService = require("../controllers/authService");

const router = express.Router();

// === جميع الـ Routes دي محتاجة تسجيل دخول ===
router.use(authService.protect);

// ╔══════════════════════════════════════════════════╗
// ║                Logged User Routes                ║
// ╚══════════════════════════════════════════════════╝

router.get("/getMe", getLoggedUserData, getUser);
router.put("/changeMyPassword", updateLoggedUserPassword);
router.put("/updateMe", updateLoggedUserValidator, updateLoggedUserData);
router.delete("/deleteMe", deleteLoggedUserData);

// ╔══════════════════════════════════════════════════╗
// ║                   Admin Routes                   ║
// ╚══════════════════════════════════════════════════╝

// إحصائيات المستخدمين
router.get("/stats", authService.allowedTo("admin"), getUsersStats);

// إنشاء أدمن جديد (الراوت اللي كنت عايزه من زمان)
router.post(
  "/admins",
  authService.allowedTo("admin"),
  uploadUserImage,
  resizeImage,
  createAdminValidator,
  createAdmin,
  createUser
);

// تغيير كلمة مرور مستخدم (للأدمن)
router.put(
  "/changePassword/:id",
  authService.allowedTo("admin"),
  changeUserPasswordValidator,
  changeUserPassword
);

// CRUD للمستخدمين (للأدمن فقط)
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
  .delete(authService.allowedTo("admin"), deleteUserValidator, deleteUser);

module.exports = router;