// router.js (النسخة النهائية المضمونة – شغالة على localhost وعلى الـ VPS)

const express = require("express");
const passport = require("passport");

// Middlewares
const cachingMiddleware = require("./middlewares/cachingMiddleware");
const { canCreateAd } = require("./middlewares/subscriptionMiddleware");
const { uploadSingleVideo } = require("./middlewares/uploadVideoMiddleware");
const { uploadSingleImage } = require("./middlewares/uploadImageMiddleware");

// Validators
const { signupValidator, loginValidator, resetPasswordValidator } = require('./utils/validators/authValidator');
const { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator } = require("./utils/validators/categoryValidator");
const { createCompanyValidator } = require("./utils/validators/companyValidator");

// Services & Controllers
const authService = require('./controllers/authService');
const { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign } = require('./controllers/campaignService');
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory, uploadCategoryImage, resizeImage: resizeCategoryImage } = require("./controllers/categoryService");
const { updateCompany, deleteCompany, approveCompany, createCompany: createCompanyService, getCompaniesByCategory, getPendingCompanies, getAllCompanies, searchCompaniesByName, resizeImage: resizeCompanyImage, searchCompaniesByCategoryAndLocation, getUserCompanies, getUserCompany, getUserCompaniesByStatus, getOneCompany, processVideo, updateCompanyVideo, incrementCompanyView } = require("./controllers/companyService");
const { getMias, getMia, createMia, updateMia, deleteMia } = require('./controllers/miaService');
const { createCheckoutSession } = require('./controllers/paymentController');
const { generateSitemap } = require('./controllers/sitemapService');
const { createFilterObj, getReviews, getReview, createReview, deleteReview, approveReview } = require('./controllers/reviewController');

// ========================================
// External Routers (أنظف طريقة في 2025)
// ========================================
const userRouter     = require("./router/userRoute");
const couponRouter   = require("./router/couponRoute");
const planRouter     = require("./router/planRoute");
const campaignRouter = require("./router/campaignRoute");
const miaRouter      = require("./router/miaRoute");
const subscriptionRouter = require("./router/subscriptionRoute");
const testRouter     = require("./router/testRoute");
const notificationRouter = require("./router/notificationRoute"); // Add this line

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
// Mounted Routers
// ========================================
router.use("/users", userRouter);
router.use("/coupons", couponRouter);
router.use("/plans", planRouter);
router.use("/campaigns", campaignRouter);
router.use("/mias", miaRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/test", testRouter);
router.use("/notifications", notificationRouter); // Add this line

// ========================================
// Protected Category Routes
// ========================================
const protectedCategoryRouter = express.Router();
protectedCategoryRouter.route("/")
  .post(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, createCategoryValidator, createCategory);

protectedCategoryRouter.route("/:id")
  .put(authService.protect, authService.allowedTo("admin", "manager"), uploadCategoryImage, resizeCategoryImage, updateCategoryValidator, updateCategory)
  .delete(authService.protect, authService.allowedTo("admin"), deleteCategoryValidator, deleteCategory);

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

protectedCompanyRouter.post("/", authService.protect, canCreateAd, uploadSingleImage("logo"), resizeCompanyImage, createCompanyValidator, createCompanyService);
protectedCompanyRouter.put("/:id", authService.protect, uploadSingleImage("logo"), resizeCompanyImage, updateCompany);
protectedCompanyRouter.delete("/:id", authService.protect, deleteCompany);

protectedCompanyRouter.get("/user/:userId", authService.protect, getUserCompanies);
protectedCompanyRouter.get("/user/:userId/company/:companyId", authService.protect, getUserCompany);
protectedCompanyRouter.get("/user/:userId/status/:status", authService.protect, getUserCompaniesByStatus);

protectedCompanyRouter.use(authService.protect, authService.allowedTo("admin"));
protectedCompanyRouter.patch("/:id/approve", approveCompany);
protectedCompanyRouter.patch("/:id/video", uploadSingleVideo("video"), processVideo, updateCompanyVideo);

router.use("/companies", protectedCompanyRouter);

// ========================================
// Payments & Sitemap
// ========================================
router.post('/payments/create-checkout-session', authService.protect, createCheckoutSession);
router.get('/sitemap.xml', generateSitemap);

module.exports = router;