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
  const uploadDir = 'uploads/categories';

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await sharp(req.file.buffer) // استخدم req.file.buffer
    .resize(600, 600)
    .toFormat('jpeg')
    .jpeg({ quality: 95 })
    .toFile(`${uploadDir}/${filename}`);

  req.body.image = `${uploadDir.split('/').pop()}/${filename}`; // احفظ اسم الملف في body
  next();
});

// CRUD
exports.getCategories = factory.getAll(Category);
exports.getCategory = factory.getOne(Category);
exports.createCategory = factory.createOne(Category);
exports.updateCategory = factory.updateOne(Category);
exports.deleteCategory = factory.deleteOne(Category);