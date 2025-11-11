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
const { getCoupon, getCoupons, updateCoupon, deleteCoupon, createCouponDirect } = require("./controllers/couponService");
const { getMias, getMia, createMia, updateMia, deleteMia } = require('./controllers/miaService');
const { createCheckoutSession } = require('./controllers/paymentController');
const { getPlans, getPlan, createPlan, updatePlan, deletePlan } = require('./controllers/planController');
const { createReview, getReviews, getReview, deleteReview, approveReview, createFilterObj } = require('./controllers/reviewController');
const { generateSitemap } = require('./controllers/sitemapService');
const {
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  getUsersStats,
  changeUserPassword,
  uploadUserImage,
  resizeImage: resizeUserImage, // Alias resizeImage to resizeUserImage
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} = require('./controllers/userService');

// Main router instance
const router = express.Router();

//--------------------------------------------------
// Auth Routes
//--------------------------------------------------
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

//--------------------------------------------------
// Categories Routes (Public)
//--------------------------------------------------
router.get("/categories", cachingMiddleware, getCategories);
router.get("/categories/:id", getCategoryValidator, getCategory);

//--------------------------------------------------
// Companies Routes (Public)
//--------------------------------------------------
router.get("/companies", getAllCompanies);
router.get("/companies/search", searchCompaniesByName);
router.get("/companies/category/:categoryId", getCompaniesByCategory);
router.get("/companies/category/:categoryId/search-location", searchCompaniesByCategoryAndLocation);

// Admin only - Get Pending Companies (moved here to be before /:id)
router.get("/companies/pending", authService.protect, authService.allowedTo("admin"), getPendingCompanies);
router.get("/companies/:id", getOneCompany);
router.patch("/companies/:id/view", incrementCompanyView);

//--------------------------------------------------
// User Routes
//--------------------------------------------------
router.use(authService.protect);

// Logged user routes
router.get("/users/getMe", getLoggedUserData, getUser);
router.put("/users/changeMyPassword", updateLoggedUserPassword);
router.put("/users/updateMe", updateLoggedUserValidator, updateLoggedUserData);
router.delete("/users/deleteMe", deleteLoggedUserData);

// Admin only user management routes
router.get("/users/stats", authService.allowedTo("admin"), getUsersStats);
router.put("/users/changePassword/:id", authService.allowedTo("admin"), changeUserPasswordValidator, changeUserPassword);
router.route("/users").get(authService.allowedTo("admin"), getUsers).post(authService.allowedTo("admin"), uploadUserImage, resizeUserImage, createUserValidator, createUser);
router.route("/users/:id").get(authService.allowedTo("admin"), getUserValidator, getUser).put(authService.allowedTo("admin"), updateUser).delete(authService.allowedTo("admin"), deleteUserValidator, deleteUser);

//--------------------------------------------------
// Categories Routes (Protected)
//--------------------------------------------------
const protectedCategoryRouter = express.Router();

protectedCategoryRouter.route("/")
    .post(authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, createCategoryValidator, createCategory);

protectedCategoryRouter.route("/:id")
    .put(authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, updateCategoryValidator, updateCategory)
    .delete(authService.allowedTo("admin"), deleteCategoryValidator, deleteCategory);

router.use("/categories", protectedCategoryRouter);

//--------------------------------------------------
// Reviews Routes (Nested under Companies)
//--------------------------------------------------
const reviewRouter = express.Router({ mergeParams: true });
reviewRouter.route('/').get(createFilterObj, getReviews).post(authService.protect, authService.allowedTo('user'), createReview);
reviewRouter.route('/:id').get(getReview).delete(authService.protect, authService.allowedTo('admin'), deleteReview);
reviewRouter.route('/:id/approve').patch(authService.protect, authService.allowedTo('admin'), approveReview);

//--------------------------------------------------
// Companies Routes (Protected)
//--------------------------------------------------
const protectedCompanyRouter = express.Router();
protectedCompanyRouter.use('/:companyId/reviews', reviewRouter); // Nest reviews
protectedCompanyRouter.post("/", uploadSingleImage("logo"), resizeCompanyImage, createCompanyValidator, createCompanyService);
protectedCompanyRouter.put("/:id", uploadSingleImage("logo"), resizeCompanyImage, updateCompany);
protectedCompanyRouter.delete("/:id", deleteCompany);
// User-specific
protectedCompanyRouter.get("/user/:userId", getUserCompanies);
protectedCompanyRouter.get("/user/:userId/company/:companyId", getUserCompany);
protectedCompanyRouter.get("/user/:userId/status/:status", getUserCompaniesByStatus);
// Admin only (remaining routes)
protectedCompanyRouter.use(authService.allowedTo("admin"));
protectedCompanyRouter.patch("/:id/approve", approveCompany);
protectedCompanyRouter.patch("/:id/video", uploadSingleVideo("video"), processVideo, updateCompanyVideo);
router.use("/companies", protectedCompanyRouter);

//--------------------------------------------------
// Coupons Routes
//--------------------------------------------------
const couponRouter = express.Router();

// حماية كل مسارات الكوبونات
couponRouter.use(authService.protect, authService.allowedTo("admin", "manager"));

couponRouter
  .route("/")
  .get(getCoupons)
  .post(createCouponDirect);   

couponRouter
  .route("/:id")
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

router.use("/coupons", couponRouter);

//--------------------------------------------------
// Plans Routes
//--------------------------------------------------
const planRouter = express.Router();
planRouter.route('/').get(getPlans);
planRouter.route('/:id').get(getPlan);
// Admin only
planRouter.use(authService.protect, authService.allowedTo('admin'));
planRouter.route('/').post(createPlan);
planRouter.route('/:id').put(updatePlan).delete(deletePlan);
router.use("/plans", planRouter);

//--------------------------------------------------
// Campaigns Routes
//--------------------------------------------------
const campaignRouter = express.Router();
campaignRouter.route('/').get(getCampaigns).post(authService.protect, authService.allowedTo('admin', 'manager'), createCampaign);
campaignRouter.route('/:id').get(getCampaign).put(authService.protect, authService.allowedTo('admin', 'manager'), updateCampaign).delete(authService.protect, authService.allowedTo('admin'), deleteCampaign);
router.use("/campaigns", campaignRouter);

//--------------------------------------------------
// MIA Routes
//--------------------------------------------------
const miaRouter = express.Router();
miaRouter.route('/').get(getMias).post(authService.protect, authService.allowedTo('admin', 'manager'), createMia);
miaRouter.route('/:id').get(getMia).put(authService.protect, authService.allowedTo('admin', 'manager'), updateMia).delete(authService.protect, authService.allowedTo('admin'), deleteMia);
router.use("/mias", miaRouter);

//--------------------------------------------------
// Payment Routes
//--------------------------------------------------
const paymentRouter = express.Router();
paymentRouter.post('/create-checkout-session', authService.protect, createCheckoutSession);
router.use("/payments", paymentRouter);

//--------------------------------------------------
// Sitemap Route
//--------------------------------------------------
const sitemapRouter = express.Router();
sitemapRouter.get('/sitemap.xml', generateSitemap);
router.use("/", sitemapRouter);

module.exports = router;