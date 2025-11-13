const express = require("express");
const reviewRoute = require('./reviewRoute');

const { uploadSingleVideo } = require("../middlewares/uploadVideoMiddleware");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const {
  updateCompany,
  deleteCompany,
  approveCompany,
  rejectCompany,
  createCompany,
  getCompaniesByCategory,
  getPendingCompanies,
  getAllCompanies,
  searchCompaniesByName,
  resizeImage,
  searchCompaniesByCategoryAndLocation,
  getUserCompanies,
  getUserCompany,
  getUserCompaniesByStatus,
  getOneCompany,
  processVideo,
  updateCompanyVideo,
  incrementCompanyView,
} = require("../controllers/companyService");

const { createCompanyValidator } = require("../utils/validators/companyValidator");

const { canCreateAd } = require('../middlewares/subscriptionMiddleware');

const auth = require("../controllers/authService");

const router = express.Router();

// Nested route for reviews
router.use('/:companyId/reviews', reviewRoute);

// Public routes
router.get("/", getAllCompanies);
router.get("/:id", getOneCompany);
router.get("/search", searchCompaniesByName);
router.get("/category/:categoryId", getCompaniesByCategory);
router.get("/category/:categoryId/search-location", searchCompaniesByCategoryAndLocation);
router.patch("/:id/view", incrementCompanyView);

// Protected routes
router.use(auth.protect);

router.post(
  "/",
  uploadSingleImage("logo"),
  resizeImage,
  canCreateAd, // Check if user can create an ad
  createCompanyValidator,
  createCompany
);
router.put("/:id", uploadSingleImage("logo"), resizeImage, updateCompany);
router.delete("/:id", deleteCompany);

// User-specific routes
router.get("/user/:userId", getUserCompanies);
router.get("/user/:userId/company/:companyId", getUserCompany);
router.get("/user/:userId/status/:status", getUserCompaniesByStatus);

// Admin routes
router.use(auth.allowedTo("admin"));

router.get("/pending", getPendingCompanies);
router.patch("/:id/approve", approveCompany);
router.patch("/:id/reject", rejectCompany);
router.patch(
  "/:id/video",
  uploadSingleVideo("video"),
  processVideo,
  updateCompanyVideo
);

module.exports = router;