const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');

const factory = require('./handlersFactory');
const ApiError = require('../utils/apiError');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');
const Category = require('../model/categoryModel');
const Company = require('../model/companyModel'); // Import Company model
const { deleteImage } = require('../utils/fileHelper');
const { sendSuccessResponse, statusCodes } = require('../utils/responseHandler');

exports.uploadCategoryImage = uploadSingleImage('image');

exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const uploadsDir = path.join('uploads', 'categories');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `category-${uuidv4()}-${Date.now()}.jpeg`;
  const outputPath = path.join(uploadsDir, filename);

  await sharp(req.file.path)
    .resize(600, 600)
    .toFormat('jpeg')
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  // حذف الملف المؤقت
  fs.unlinkSync(req.file.path);

  req.body.image = filename;
  next();
});

// @desc    Get list of categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = factory.getAll(Category, 'Category', [], ['nameAr', 'nameEn']);

// @desc    Get specific category by id
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = factory.getOne(Category);

// @desc Search categories by name
// @route GET /api/v1/categories/search?keyword=<keyword>
// @access Public
exports.searchCategories = asyncHandler(async (req, res, next) => {
  const { keyword } = req.query;
  if (!keyword) {
    return next(new ApiError("يرجى إدخال كلمة البحث للفئة", statusCodes.BAD_REQUEST));
  }

  // ApiFeatures will pick up req.query.keyword
  // We need to specify the fields to search within the Category model
  return factory.getAll(Category, 'Category', [], ['nameAr', 'nameEn'])(req, res, next);
});

// @desc    Create category
// @route   POST  /api/v1/categories
// @access  Private/Admin-Manager
exports.createCategory = factory.createOne(Category);

// @desc    Update specific category
// @route   PUT /api/v1/categories/:id
// @access  Private/Admin-Manager
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    return next(new ApiError(`No category for this id ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // إذا كان هناك صورة جديدة، احذف القديمة
  if (req.body.image && category.image) {
    await deleteImage('categories', category.image);
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث الفئة بنجاح', {
    data: updatedCategory,
  });
});

// @desc    Delete specific category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    return next(new ApiError(`No category for this id ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // حذف الصورة المرتبطة إذا وجدت
  if (category.image) {
    await deleteImage('categories', category.image);
  }

  await Category.findByIdAndDelete(req.params.id);

  sendSuccessResponse(res, statusCodes.NO_CONTENT);
});

// @desc    Get category statistics (number of companies per category)
// @route   GET /api/v1/categories/stats
// @access  Private/Admin
exports.getCategoryStats = asyncHandler(async (req, res, next) => {
  const stats = await Category.aggregate([
    {
      $lookup: {
        from: 'companies', // The name of the companies collection
        localField: '_id',
        foreignField: 'categoryId', // Assuming categoryId in Company model links to _id in Category model
        as: 'companies',
      },
    },
    {
      $project: {
        _id: 0,
        category: {
          id: '$_id',
          nameAr: '$nameAr',
          nameEn: '$nameEn',
        },
        companyCount: { $size: '$companies' }, // Count the number of companies in the array
      },
    },
    {
      $sort: { companyCount: -1 }, // Sort by most popular
    },
  ]);

  sendSuccessResponse(res, statusCodes.OK, 'Category statistics retrieved successfully', {
    data: stats,
  });
});