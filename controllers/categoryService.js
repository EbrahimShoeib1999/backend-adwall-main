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
exports.getCategories = factory.getAll(Category);

// @desc    Get specific category by id
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = factory.getOne(Category);

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

    const stats = await Company.aggregate([

      {

        $group: {

          _id: '$categoryId',

          companyCount: { $sum: 1 },

        },

      },

      {

        $lookup: {

          from: 'categories', // The name of the categories collection

          localField: '_id',

          foreignField: '_id',

          as: 'category',

        },

      },

      {

        $unwind: '$category',

      },

      {

        $project: {

          _id: 0,

          category: {

            id: '$category._id',

            nameAr: '$category.nameAr',

            nameEn: '$category.nameEn',

          },

          companyCount: 1,

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

  