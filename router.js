const express = require("express");
const passport = require("passport");

// Middlewares
const cachingMiddleware = require("./middlewares/cachingMiddleware");
const { uploadSingleVideo } = require("./middlewares/uploadVideoMiddleware");
const { uploadSingleImage } = require("./middlewares/uploadImageMiddleware");
  
// Validators
const { signupValidator, loginValidator } = require('./utils/validators/authValidator');
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
const { getUsers, getUser, createUser, updateUser, deleteUser, uploadUserImage, resizeImage: resizeUserImage, changeUserPassword, getLoggedUserData, updateLoggedUserPassword, updateLoggedUserData, deleteLoggedUserData, getUsersStats } = require("./controllers/userService");

// Main router instance
const router = express.Router();

//--------------------------------------------------
// Auth Routes
// Base URL: /api/v1/Auth
// Usage: Handles user and admin authentication, registration, and profile management.
// All login and user management for both roles are unified under this base URL.
//--------------------------------------------------
const authRouter = express.Router();
authRouter.post('/signup', signupValidator, authService.signup);
authRouter.post('/login', loginValidator, authService.login);
authRouter.post('/forgotPassword', authService.forgotPassword);
authRouter.post('/verifyResetCode', authService.verifyPassResetCode);
authRouter.put('/resetPassword', authService.resetPassword);
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRouter.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
});
authRouter.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
authRouter.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
});

// Protected user routes (for both regular users and admins)
authRouter.use(authService.protect);
authRouter.get("/getMe", getLoggedUserData, getUser);
authRouter.put("/changeMyPassword", updateLoggedUserPassword);
authRouter.put("/updateMe", updateLoggedUserValidator, updateLoggedUserData);
authRouter.delete("/deleteMe", deleteLoggedUserData);

// Admin only user management routes
authRouter.use(authService.allowedTo("admin"));
authRouter.get("/stats", getUsersStats);
authRouter.put("/changePassword/:id", changeUserPasswordValidator, changeUserPassword);
authRouter.route("/").get(getUsers).post(uploadUserImage, resizeUserImage, createUserValidator, createUser);
authRouter.route("/:id").get(getUserValidator, getUser).put(uploadUserImage, resizeUserImage, updateUserValidator, updateUser).delete(deleteUserValidator, deleteUser);
router.use("/Auth", authRouter);


//--------------------------------------------------
// Categories Routes
// Base URL: /api/v1/categories
// Usage: Manages company categories.
//--------------------------------------------------
const categoryRouter = express.Router();
categoryRouter.route("/").get(cachingMiddleware, getCategories).post(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, createCategoryValidator, createCategory);
categoryRouter.route("/:id").get(getCategoryValidator, getCategory).put(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, updateCategoryValidator, updateCategory).delete(authService.protect, authService.allowedTo("admin"), deleteCategoryValidator, deleteCategory);
router.use("/categories", categoryRouter);


//--------------------------------------------------
// Reviews Routes (Nested under Companies)
// Base URL: /api/v1/companies/:companyId/reviews
// Usage: Manages reviews for companies.
//--------------------------------------------------
const reviewRouter = express.Router({ mergeParams: true });
reviewRouter.route('/').get(createFilterObj, getReviews).post(authService.protect, authService.allowedTo('user'), createReview);
reviewRouter.route('/:id').get(getReview).delete(authService.protect, authService.allowedTo('admin'), deleteReview);
reviewRouter.route('/:id/approve').patch(authService.protect, authService.allowedTo('admin'), approveReview);


//--------------------------------------------------
// Companies Routes
// Base URL: /api/v1/companies
// Usage: Manages company listings and ads.
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
// Base URL: /api/v1/coupons
// Usage: Manages discount coupons (Admin/Manager only).
//--------------------------------------------------
const couponRouter = express.Router();
couponRouter.use(authService.protect, authService.allowedTo("admin", "manager"));
couponRouter.route("/").get(getCoupons).post(createCoupon);
couponRouter.route("/:id").get(getCoupon).put(updateCoupon).delete(deleteCoupon);
router.use("/coupons", couponRouter);


//--------------------------------------------------
// Plans Routes
// Base URL: /api/v1/plans
// Usage: Manages subscription plans.
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
// Base URL: /api/v1/campaigns
// Usage: Manages ad campaigns (Admin/Manager only).
//--------------------------------------------------
const campaignRouter = express.Router();
campaignRouter.route('/').get(getCampaigns).post(authService.protect, authService.allowedTo('admin', 'manager'), createCampaign);
campaignRouter.route('/:id').get(getCampaign).put(authService.protect, authService.allowedTo('admin', 'manager'), updateCampaign).delete(authService.protect, authService.allowedTo('admin'), deleteCampaign);
router.use("/campaigns", campaignRouter);


//--------------------------------------------------
// MIA Routes
// Base URL: /api/v1/mias
// Usage: Manages MIA data (Admin/Manager only).
//--------------------------------------------------
const miaRouter = express.Router();
miaRouter.route('/').get(getMias).post(authService.protect, authService.allowedTo('admin', 'manager'), createMia);
miaRouter.route('/:id').get(getMia).put(authService.protect, authService.allowedTo('admin', 'manager'), updateMia).delete(authService.protect, authService.allowedTo('admin'), deleteMia);
router.use("/mias", miaRouter);


//--------------------------------------------------
// Payment Routes
// Base URL: /api/v1/payments
// Usage: Handles payment checkout sessions.
//--------------------------------------------------
const paymentRouter = express.Router();
paymentRouter.post('/create-checkout-session', authService.protect, createCheckoutSession);
router.use("/payments", paymentRouter);


//--------------------------------------------------
// Sitemap Route
// Base URL: /api/v1/sitemap.xml
// Usage: Generates the sitemap for SEO.
//--------------------------------------------------
const sitemapRouter = express.Router();
sitemapRouter.get('/sitemap.xml', generateSitemap);
router.use("/", sitemapRouter);


module.exports = router;
