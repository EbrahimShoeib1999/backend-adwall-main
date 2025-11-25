const express = require("express");
const {
  getCategoryValidator,
  createCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
} = require("../utils/validators/categoryValidator");
const { validateQueryParams } = require("../utils/validators/queryValidator"); // Add this import

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  resizeImage,
  getCategoryStats,
  searchCategories, // Add this import
} = require("../controllers/categoryService");

const authService = require("../controllers/authService");

const router = express.Router();

router.get('/stats',
  authService.protect,
  authService.allowedTo('admin'),
  getCategoryStats
);

// New search route - placed before /:id
router.get("/search", validateQueryParams, searchCategories);

router
  .route("/")
  .get(validateQueryParams, getCategories)
  .post(
    authService.protect,
    authService.allowedTo("admin", "manager"),
    uploadCategoryImage,
    resizeImage,
    createCategoryValidator,
    createCategory
  );

router
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(
    authService.protect,
    authService.allowedTo("admin", "manager"),
    uploadCategoryImage,
    resizeImage,
    updateCategoryValidator,
    updateCategory
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin"),
    deleteCategoryValidator,
    deleteCategory
  );

module.exports = router;