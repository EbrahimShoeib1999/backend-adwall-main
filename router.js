const express = require("express");
const passport = require("passport");

// Middlewares
const cachingMiddleware = require("./middlewares/cachingMiddleware");
const { uploadSingleVideo } = require("./middlewares/uploadVideoMiddleware");
const { uploadSingleImage } = require("./middlewares/uploadImageMiddleware");

// Validators
const { signupValidator, loginValidator, resetPasswordValidator } = require('./utils/validators/authValidator');
const { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator } = require("./utils/validators/categoryValidator");
const { createCompanyValidator } = require("./utils/validators/companyValidator");
const { getUserValidator, createUserValidator, updateUserValidator, deleteUserValidator, changeUserPasswordValidator, updateLoggedUserValidator } = require("./utils/validators/userValidator");

// Services & Controllers
const authService = require('./controllers/authService');
const { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign } = require('./controllers/campaignService');
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory, uploadCategoryImage, resizeImage: resizeCategoryImage } = require("./controllers/categoryService");
const { updateCompany, deleteCompany, approveCompany, createCompany: createCompanyService, getCompaniesByCategory, getPendingCompanies, getAllCompanies, searchCompaniesByName, resizeImage: resizeCompanyImage, searchCompaniesByCategoryAndLocation, getUserCompanies, getUserCompany, getUserCompaniesByStatus, getOneCompany, processVideo, updateCompanyVideo, incrementCompanyView } = require("./controllers/companyService");
const { getMias, getMia, createMia, updateMia, deleteMia } = require('./controllers/miaService');
const { createCheckoutSession } = require('./controllers/paymentController');
const { getPlans, getPlan, createPlan, updatePlan, deletePlan } = require('./controllers/planController');
const { createReview, getReviews, getReview, deleteReview, approveReview, createFilterObj } = require('./controllers/reviewController');
const { generateSitemap } = require('./controllers/sitemapService');
const {
  getLoggedUserData, updateLoggedUserPassword, updateLoggedUserData, deleteLoggedUserData,
  getUsersStats, changeUserPassword, uploadUserImage, resizeImage: resizeUserImage,
  createUser, getUsers, getUser, updateUser, deleteUser,
} = require('./controllers/userService');

// Main router instance
const router = express.Router();

// ========================================
// Auth Routes
// ========================================
router.post('/auth/signup', signupValidator, authService.signup);
router.post('/auth/login', loginValidator, authService.login);
router.post('/auth/forgotPassword', authService.forgotPassword);
router.post('/auth/verifyResetCode', authService.verifyPassResetCode);
router.put('/auth/resetPassword', resetPasswordValidator, authService.resetPassword);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
});
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/auth/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
});

// ========================================
// Public Routes
// ========================================
router.get("/categories", cachingMiddleware, getCategories);
router.get("/categories/:id", getCategoryValidator, getCategory);

router.get("/companies", getAllCompanies);
router.get("/companies/search", searchCompaniesByName);
router.get("/companies/category/:categoryId", getCompaniesByCategory);
router.get("/companies/category/:categoryId/search-location", searchCompaniesByCategoryAndLocation);
router.get("/companies/pending", authService.protect, authService.allowedTo("admin"), getPendingCompanies);
router.get("/companies/:id", getOneCompany);
router.patch("/companies/:id/view", incrementCompanyView);

// ========================================
// Protected User Routes
// ========================================
router.use(authService.protect);

router.get("/users/getMe", getLoggedUserData, getUser);
router.put("/users/changeMyPassword", updateLoggedUserPassword);
router.put("/users/updateMe", updateLoggedUserValidator, updateLoggedUserData);
router.delete("/users/deleteMe", deleteLoggedUserData);

router.get("/users/stats", authService.allowedTo("admin"), getUsersStats);
router.put("/users/changePassword/:id", authService.allowedTo("admin"), changeUserPasswordValidator, changeUserPassword);

router.route("/users")
  .get(authService.allowedTo("admin"), getUsers)
  .post(authService.allowedTo("admin"), uploadUserImage, resizeUserImage, createUserValidator, createUser);

router.route("/users/:id")
  .get(authService.allowedTo("admin"), getUserValidator, getUser)
  .put(authService.allowedTo("admin"), updateUser)
  .delete(authService.allowedTo("admin"), deleteUserValidator, deleteUser);

// ========================================
// Protected Category Routes
// ========================================
const protectedCategoryRouter = express.Router();
protectedCategoryRouter.route("/")
  .post(authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, createCategoryValidator, createCategory);

protectedCategoryRouter.route("/:id")
  .put(authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, updateCategoryValidator, updateCategory)
  .delete(authService.allowedTo("admin"), deleteCategoryValidator, deleteCategory);

router.use("/categories", protectedCategoryRouter);

// ========================================
// Reviews (Nested)
// ========================================
const reviewRouter = express.Router({ mergeParams: true });
reviewRouter.route('/').get(createFilterObj, getReviews).post(authService.protect, authService.allowedTo('user'), createReview);
reviewRouter.route('/:id').get(getReview).delete(authService.protect, authService.allowedTo('admin'), deleteReview);
reviewRouter.route('/:id/approve').patch(authService.protect, authService.allowedTo('admin'), approveReview);

// ========================================
// Protected Company Routes
// ========================================
const protectedCompanyRouter = express.Router();
protectedCompanyRouter.use('/:companyId/reviews', reviewRouter);

protectedCompanyRouter.post("/", uploadSingleImage("logo"), resizeCompanyImage, createCompanyValidator, createCompanyService);
protectedCompanyRouter.put("/:id", uploadSingleImage("logo"), resizeCompanyImage, updateCompany);
protectedCompanyRouter.delete("/:id", deleteCompany);

protectedCompanyRouter.get("/user/:userId", getUserCompanies);
protectedCompanyRouter.get("/user/:userId/company/:companyId", getUserCompany);
protectedCompanyRouter.get("/user/:userId/status/:status", getUserCompaniesByStatus);

protectedCompanyRouter.use(authService.allowedTo("admin"));
protectedCompanyRouter.patch("/:id/approve", approveCompany);
protectedCompanyRouter.patch("/:id/video", uploadSingleVideo("video"), processVideo, updateCompanyVideo);

router.use("/companies", protectedCompanyRouter);

// ========================================
// Coupons Routes – استخدمنا ملف منفصل (الأفضل والأنظف)
// ========================================
const couponRouter = require("./router/couponRoute");
router.use("/coupons", couponRouter);

// ========================================
// Plans, Campaigns, MIA, Payments, Sitemap
// ========================================
router.use("/plans", require("./router/planRoute") || (() => {
  const r = express.Router();
  r.route('/').get(getPlans);
  r.route('/:id').get(getPlan);
  r.use(authService.protect, authService.allowedTo('admin'));
  r.route('/').post(createPlan);
  r.route('/:id').put(updatePlan).delete(deletePlan);
  return r;
})());

router.use("/campaigns", require("./router/campaignRoute") || (() => {
  const r = express.Router();
  r.route('/').get(getCampaigns).post(authService.protect, authService.allowedTo('admin', 'manager'), createCampaign);
  r.route('/:id').get(getCampaign).put(authService.protect, authService.allowedTo('admin', 'manager'), updateCampaign).delete(authService.protect, authService.allowedTo('admin'), deleteCampaign);
  return r;
})());

router.use("/mias", require("./router/miaRoute") || (() => {
  const r = express.Router();
  r.route('/').get(getMias).post(authService.protect, authService.allowedTo('admin', 'manager'), createMia);
  r.route('/:id').get(getMia).put(authService.protect, authService.allowedTo('admin', 'manager'), updateMia).delete(authService.protect, authService.allowedTo('admin'), deleteMia);
  return r;
})());

router.use("/payments", (() => {
  const r = express.Router();
  r.post('/create-checkout-session', authService.protect, createCheckoutSession);
  return r;
})());

router.use("/", (() => {
  const r = express.Router();
  r.get('/sitemap.xml', generateSitemap);
  return r;
})());

module.exports = router;