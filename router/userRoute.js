console.log("--- LOADING UPDATED userRoute.js with /admins ROUTE ---");
const express = require("express");
const {
  getUserValidator,
  createUserValidator,
  changeUserPasswordValidator,
  updateLoggedUserValidator,
  createAdminValidator,
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

const authService = require("../controllers/authService");
const { allowedTo } = require("../middlewares/auth");


const router = express.Router();

router.use(authService.protect);

router.get("/getMe", getLoggedUserData, getUser);
router.put("/changeMyPassword", updateLoggedUserPassword);
router.put("/updateMe", updateLoggedUserValidator, updateLoggedUserData);
router.delete("/deleteMe", deleteLoggedUserData);

// Admin
router.get("/stats", allowedTo("admin"), getUsersStats);
router.post(
  "/admins",
  allowedTo("admin"),
  uploadUserImage,
  resizeImage,
  createAdminValidator,
  createAdmin,
  createUser
);

router.put(
  "/changePassword/:id",
  allowedTo("admin"),
  changeUserPasswordValidator,
  changeUserPassword
);
router
  .route("/")
  .get(allowedTo("admin"), getUsers)
  .post(
    allowedTo("admin"),
    uploadUserImage,
    resizeImage,
    createUserValidator,
    createUser
  );
router
  .route("/:id")
  .get(allowedTo("admin"), getUserValidator, getUser)
  .put(
    allowedTo("admin"),
    uploadUserImage,
    resizeImage,
    updateUserValidator,
    updateUser
  )
  .delete(
    allowedTo("admin"),
    deleteUserValidator,
    deleteUser
  );

module.exports = router;