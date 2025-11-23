const express = require("express");
const reviewRoute = require('./reviewRoute');

const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const {
  createCompany,
  updateCompany,
  deleteCompany,
  approveCompany,
  rejectCompany,
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
const authService = require("../controllers/authService");

const router = express.Router();

// Nested route for reviews
router.use('/:companyId/reviews', reviewRoute);

// Public routes
router.get("/", getAllCompanies);
router.get("/:id", getOneCompany);
router.get("/search/name", searchCompaniesByName);
router.get("/category/:categoryId", getCompaniesByCategory);
router.get("/category/:categoryId/search-location", searchCompaniesByCategoryAndLocation);
router.patch("/:id/view", incrementCompanyView);

// Protected routes
router.use(authService.protect);

router.post(
  "/",
  uploadSingleImage("logo"),
  resizeImage,
  createCompanyValidator,
  createCompany
);

router.put(
  "/:id", 
  uploadSingleImage("logo"), 
  resizeImage, 
  updateCompany
);

router.delete("/:id", deleteCompany);

// User-specific routes
router.get("/user/:userId", getUserCompanies);
router.get("/user/:userId/company/:companyId", getUserCompany);
router.get("/user/:userId/status/:status", getUserCompaniesByStatus);

// Video routes
router.patch(
  "/:id/video",
  uploadSingleImage("video"),
  processVideo,
  updateCompanyVideo
);

// Admin routes
router.use(authService.allowedTo("admin"));

router.get("/admin/pending", getPendingCompanies);
router.patch("/admin/:id/approve", approveCompany);
router.patch("/admin/:id/reject", rejectCompany);

module.exports = router;