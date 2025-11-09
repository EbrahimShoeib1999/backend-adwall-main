// controllers/categoryService.js
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('express-async-handler');
const fs = require('fs');

const factory = require('./handlersFactory');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');
const Category = require('../model/categoryModel');

// Upload single image
exports.uploadCategoryImage = uploadSingleImage('image');

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(); // تحقق من وجود الملف

  const filename = `category-${uuidv4()}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(600, 600)
    .toFormat('jpeg')
    .jpeg({ quality: 95 })
    .toFile(`uploads/categories/${filename}`);

  req.body.image = filename;
  next();
});

// CRUD
exports.getCategories = factory.getAll(Category);
exports.getCategory = factory.getOne(Category);
exports.createCategory = factory.createOne(Category);
exports.updateCategory = factory.updateOne(Category);
exports.deleteCategory = factory.deleteOne(Category);