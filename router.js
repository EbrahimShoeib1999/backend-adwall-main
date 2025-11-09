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
const { getCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } = require("./controllers/couponService");
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
// Categories Routes
//--------------------------------------------------
const categoryRouter = express.Router();
categoryRouter.route("/").get(cachingMiddleware, getCategories).post(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, createCategoryValidator, createCategory);
categoryRouter.route("/:id").get(getCategoryValidator, getCategory).put(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, updateCategoryValidator, updateCategory).delete(authService.protect, authService.allowedTo("admin"), deleteCategoryValidator, deleteCategory);
router.use("/categories", categoryRouter);


//--------------------------------------------------
// Reviews Routes (Nested under Companies)
//--------------------------------------------------
const reviewRouter = express.Router({ mergeParams: true });
reviewRouter.route('/').get(createFilterObj, getReviews).post(authService.protect, authService.allowedTo('user'), createReview);
reviewRouter.route('/:id').get(getReview).delete(authService.protect, authService.allowedTo('admin'), deleteReview);
reviewRouter.route('/:id/approve').patch(authService.protect, authService.allowedTo('admin'), approveReview);


//--------------------------------------------------
// Companies Routes
//--------------------------------------------------
const companyRouter = express.Router();
companyRouter.use('/:companyId/reviews', reviewRouter); // Nest reviews
// Public
companyRouter.get("/", getAllCompanies);
companyRouter.get("/search", searchCompaniesByName);
companyRouter.get("/category/:categoryId", getCompaniesByCategory);
companyRouter.get("/category/:categoryId/search-location", searchCompaniesByCategoryAndLocation);
companyRouter.get("/:id", getOneCompany);
companyRouter.patch("/:id/view", incrementCompanyView);
// Protected
companyRouter.use(authService.protect);
companyRouter.post("/", uploadSingleImage("logo"), resizeCompanyImage, createCompanyValidator, createCompanyService);
companyRouter.put("/:id", uploadSingleImage("logo"), resizeCompanyImage, updateCompany);
companyRouter.delete("/:id", deleteCompany);
// User-specific
companyRouter.get("/user/:userId", getUserCompanies);
companyRouter.get("/user/:userId/company/:companyId", getUserCompany);
companyRouter.get("/user/:userId/status/:status", getUserCompaniesByStatus);
// Admin only
companyRouter.use(authService.allowedTo("admin"));
companyRouter.get("/pending", getPendingCompanies);
companyRouter.patch("/:id/approve", approveCompany);
companyRouter.patch("/:id/video", uploadSingleVideo("video"), processVideo, updateCompanyVideo);
router.use("/companies", companyRouter);


//--------------------------------------------------
// Coupons Routes
//--------------------------------------------------
const couponRouter = express.Router();
couponRouter.use(authService.protect, authService.allowedTo("admin", "manager"));
couponRouter.route("/").get(getCoupons).post(createCoupon);
couponRouter.route("/:id").get(getCoupon).put(updateCoupon).delete(deleteCoupon);
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