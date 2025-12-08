const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
const path = require('path');
const asyncHandler = require("express-async-handler");

const Company = require("../model/companyModel");
const User = require("../model/userModel");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const { formatCategoryId, formatCompanies } = require("../utils/formatCategoryId");
const { sendSuccessResponse, statusCodes } = require("../utils/responseHandler");
const { deleteImage } = require('../utils/fileHelper');
const { createNotification } = require('./notificationController');
const factory = require('../controllers/handlersFactory');

exports.uploadCompanyImage = uploadSingleImage("logo");

exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const uploadsDir = path.join('uploads', 'companies');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `company-${uuidv4()}-${Date.now()}.jpeg`;
  const outputPath = path.join(uploadsDir, filename);

  await sharp(req.file.path)
    .resize(600, 600)
    .toFormat("jpeg")
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  // حذف الملف المؤقت
  fs.unlinkSync(req.file.path);

  req.body.logo = filename;
  next();
});

// @desc Create a new company (subscription request)
// @route POST /api/companies
// @access Public
exports.createCompany = asyncHandler(async (req, res, next) => {
  req.body.userId = req.user._id;
  const newDoc = await Company.create(req.body);

  // Notify admins about the new pending company
  const admins = await User.find({ role: 'admin' });
  admins.forEach(admin => {
    createNotification(
      req, admin._id, `شركة جديدة (${newDoc.companyName}) في انتظار المراجعة.`, 'warning', `/companies/pending`
    );
  });

  const populatedDoc = await Company.findById(newDoc._id)
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!populatedDoc) {
    return next(new ApiError("فشل في استرجاع بيانات الشركة المنشأة", statusCodes.INTERNAL_SERVER_ERROR));
  }

  const formattedDoc = formatCompanies([populatedDoc]);

  sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء الشركة بنجاح', { 
    data: formattedDoc[0] 
  });
});

// [Admin] Get all registered companies
exports.getAllCompanies = factory.getAll(Company, 'Company', [
  { path: "userId", select: "name email" },
  { path: "categoryId", select: "_id nameAr nameEn color" }
], ['companyName', 'companyNameEn', 'description', 'descriptionEn']);

// @desc Get one company with unique view tracking
// @route GET /api/companies/:id
// @access Public
exports.getOneCompany = asyncHandler(async (req, res, next) => {
  let company = await Company.findById(req.params.id)
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // ✅ تتبع المشاهدات الفريدة - كل مستخدم مرة واحدة فقط
  const companyDoc = await Company.findById(req.params.id);
  
  let shouldIncrementView = false;
  
  if (req.user?._id) {
    // مستخدم مسجل - التحقق من viewedBy array
    const userIdString = req.user._id.toString();
    const hasViewed = companyDoc.viewedBy.some(id => id.toString() === userIdString);
    
    if (!hasViewed) {
      shouldIncrementView = true;
      companyDoc.viewedBy.push(req.user._id);
    }
  } else {
    // مستخدم غير مسجل - نزيد المشاهدة (يمكن تحسين هذا لاحقاً بتتبع IP)
    // للبساطة، نفترض أن المستخدمين غير المسجلين فريدون
    shouldIncrementView = true;
  }
  
  if (shouldIncrementView) {
    companyDoc.views += 1;
    await companyDoc.save();
  }

  const formattedCompany = formatCompanies([company]);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب بيانات الشركة بنجاح', {
    data: formattedCompany[0],
  });
});

// Rest of the file continues...
