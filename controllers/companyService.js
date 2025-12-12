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
const factory = require('./handlersFactory'); // Add this line

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

  if (!req.body.logo) {
    req.body.logo = "../users/default-profile.png";
  }

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

// @desc Get one company
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
    // ✅ مستخدم غير مسجل - تتبع IP address
    const clientIP = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown';
    
    const hasViewedByIP = companyDoc.viewedByIPs.includes(clientIP);
    
    if (!hasViewedByIP && clientIP !== 'unknown') {
      shouldIncrementView = true;
      companyDoc.viewedByIPs.push(clientIP);
    }
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

// @desc Update company
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  if (company.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new ApiError('غير مصرح لك بتحديث هذه الشركة', statusCodes.FORBIDDEN));
  }

  // إذا كان هناك صورة جديدة، احذف القديمة
  if (req.body.logo && company.logo) {
    await deleteImage('companies', company.logo);
  }

  const updatedCompany = await Company.findByIdAndUpdate(id, req.body, { new: true })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  const formattedCompany = formatCompanies([updatedCompany]);

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث بيانات الشركة بنجاح', {
    data: formattedCompany[0],
  });
});

// @desc Delete company
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  if (company.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بحذف هذه الشركة", statusCodes.FORBIDDEN));
  }

  // حذف الصورة المرتبطة إذا وجدت
  if (company.logo) {
    await deleteImage('companies', company.logo);
  }

  await Company.findByIdAndDelete(id);
  sendSuccessResponse(res, statusCodes.NO_CONTENT);
});

// @desc Get companies by category
exports.getCompaniesByCategory = asyncHandler(async (req, res, next) => {
  req.filterObj = { categoryId: req.params.categoryId, status: "approved" };
  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ])(req, res, next);
});

// @desc Search companies by name
exports.searchCompaniesByName = asyncHandler(async (req, res, next) => {
  const { name } = req.query;
  if (!name) {
    return next(new ApiError("يرجى إدخال اسم الشركة للبحث", statusCodes.BAD_REQUEST));
  }

  // Map 'name' to 'keyword' for ApiFeatures
  req.query.keyword = name;
  req.filterObj = { status: "approved" };

  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ], ['companyName', 'companyNameEn', 'description', 'descriptionEn'])(req, res, next);
});

// @desc Get all pending companies (admin only)
exports.getPendingCompanies = asyncHandler(async (req, res, next) => {
  req.filterObj = { status: "pending" };
  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ], ['companyName', 'companyNameEn', 'description', 'descriptionEn'])(req, res, next);
});

// @desc Get all approved companies (admin only)
exports.getApprovedCompanies = asyncHandler(async (req, res, next) => {
  req.filterObj = { status: "approved" };
  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ], ['companyName', 'companyNameEn', 'description', 'descriptionEn'])(req, res, next);
});

// @desc Get all rejected companies (admin only)
exports.getRejectedCompanies = asyncHandler(async (req, res, next) => {
  req.filterObj = { status: "rejected" };
  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ], ['companyName', 'companyNameEn', 'description', 'descriptionEn'])(req, res, next);
});

// @desc Search companies by city and country
exports.searchCompaniesByLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  if (!city && !country) {
    return next(new ApiError("يرجى إدخال المدينة أو الدولة للبحث", statusCodes.BAD_REQUEST));
  }

  req.filterObj = { status: "approved" };
  if (city) req.filterObj.city = { $regex: city, $options: "i" };
  if (country) req.filterObj.country = { $regex: country, $options: "i" };

  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ])(req, res, next);
});

// @desc Search companies by category and location
exports.searchCompaniesByCategoryAndLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  const { categoryId } = req.params;

  if (!categoryId) {
    return next(new ApiError("يرجى تحديد الفئة", statusCodes.BAD_REQUEST));
  }

  req.filterObj = { categoryId, status: "approved" };
  if (city) req.filterObj.city = { $regex: city, $options: "i" };
  if (country) req.filterObj.country = { $regex: country, $options: "i" };

  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ])(req, res, next);
});

// @desc Admin approve company
exports.approveCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const updatedCompany = await Company.findOneAndUpdate(
    { _id: id, status: { $ne: "approved" } },
    { status: "approved" },
    { new: true }
  )
    .populate("userId", "name email")
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!updatedCompany) {
    const company = await Company.findById(id);
    if (!company) return next(new ApiError("الشركة غير موجودة", statusCodes.NOT_FOUND));
    return next(new ApiError("تمت الموافقة على الشركة مسبقاً", statusCodes.BAD_REQUEST));
  }

  const formattedCompany = formatCompanies([updatedCompany]);

  // Notify the company owner
  createNotification(
    req, updatedCompany.userId._id, `تهانينا! تمت الموافقة على شركتك "${updatedCompany.companyName}".`, 'success', `/company/${updatedCompany._id}`
  );

  try {
    if (formattedCompany[0].userId) {
      const message = `Hi ${formattedCompany[0].userId.name},\n\nCongratulations! Your company "${formattedCompany[0].companyName}" has been approved and is now live on AddWall.\n\nThanks,\nThe AddWall Team`;
      await sendEmail({
        email: formattedCompany[0].userId.email,
        subject: "Your Company has been Approved",
        message,
      });
    }
  } catch (err) {
    console.error(`Failed to send approval email:`, err);
  }

  sendSuccessResponse(res, statusCodes.OK, 'تمت الموافقة على الشركة بنجاح', {
    data: formattedCompany[0],
  });
});

// @desc Admin reject company
exports.rejectCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return next(new ApiError("يرجى تقديم سبب الرفض", statusCodes.BAD_REQUEST));
  }

  const company = await Company.findById(id)
    .populate('userId', 'name email')
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!company) return next(new ApiError("الشركة غير موجودة", statusCodes.NOT_FOUND));
  if (company.status === 'rejected') return next(new ApiError("تم رفض الشركة مسبقاً", statusCodes.BAD_REQUEST));

  const updatedCompany = await Company.findByIdAndUpdate(id, { status: 'rejected', rejectionReason: reason }, { new: true })
    .populate('userId', 'name email')
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  const formattedCompany = formatCompanies([updatedCompany]);

  // Notify the company owner
  createNotification(
    req, updatedCompany.userId._id, `للأسف، تم رفض شركتك "${updatedCompany.companyName}". السبب: ${reason}`, 'error', `/my-companies`
  );

  try {
    if (formattedCompany[0].userId) {
      const message = `Hi ${formattedCompany[0].userId.name},\n\nWe regret to inform you that your company submission "${formattedCompany[0].companyName}" has been rejected for the following reason:\n${reason}\n\nIf you have any questions, please contact our support team.\n\nThanks,\nThe AddWall Team`;
      await sendEmail({
        email: formattedCompany[0].userId.email,
        subject: "Your Company Submission Status",
        message,
      });
    }
  } catch (err) {
    console.error(`Failed to send rejection email:`, err);
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم رفض الشركة بنجاح', {
    data: formattedCompany[0],
  });
});

// @desc Get all companies for a specific user
exports.getUserCompanies = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", statusCodes.FORBIDDEN));
  }

  req.filterObj = { userId };
  // Set default sort in req.query if not already present, so ApiFeatures can pick it up
  if (!req.query.sort) {
    req.query.sort = '-createdAt';
  }

  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ])(req, res, next);
});

// @desc Get a specific company for a specific user
exports.getUserCompany = asyncHandler(async (req, res, next) => {
  const { userId, companyId } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركة", statusCodes.FORBIDDEN));
  }

  let company = await Company.findOne({ _id: companyId, userId })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!company) {
    return next(new ApiError("الشركة غير موجودة أو لا تنتمي لك", statusCodes.NOT_FOUND));
  }

  const formattedCompany = formatCompanies([company]);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب بيانات الشركة بنجاح', {
    data: formattedCompany[0],
  });
});

// @desc Get user's companies by status
exports.getUserCompaniesByStatus = asyncHandler(async (req, res, next) => {
  const { userId, status } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", statusCodes.FORBIDDEN));
  }

  if (!["approved", "pending", "rejected"].includes(status)) {
    return next(new ApiError("حالة غير صحيحة", statusCodes.BAD_REQUEST));
  }

  req.filterObj = { userId, status };
  // Set default sort in req.query if not already present, so ApiFeatures can pick it up
  if (!req.query.sort) {
    req.query.sort = '-createdAt';
  }

  return factory.getAll(Company, 'Company', [
    { path: "categoryId", select: "_id nameAr nameEn color" }
  ])(req, res, next);
});



// @desc Increment view count
exports.incrementCompanyView = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم زيادة عدد المشاهدات بنجاح');
});

// @desc Process video upload
exports.processVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const uploadsDir = path.join('uploads', 'videos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `company-video-${uuidv4()}-${Date.now()}.mp4`;
  const outputPath = path.join(uploadsDir, filename);

  await new Promise((resolve, reject) => {
    ffmpeg(req.file.path)
      .toFormat('mp4')
      .outputOptions([
        '-c:v libx264',
        '-preset slow',
        '-crf 28',
        '-c:a aac',
        '-b:a 128k',
      ])
      .on('end', () => {
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        resolve();
      })
      .on('error', (err) => {
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        reject(new ApiError(`فشل في معالجة الفيديو: ${err.message}`, statusCodes.INTERNAL_SERVER_ERROR));
      })
      .save(outputPath);
  });

  req.body.video = filename;
  next();
});

// @desc Update company video
exports.updateCompanyVideo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const company = await Company.findByIdAndUpdate(
    id,
    { video: req.body.video },
    { new: true }
  )
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  const formattedCompany = formatCompanies([company]);

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث الفيديو بنجاح', {
    data: formattedCompany[0],
  });
});

// @desc Update company views
// @route PATCH /api/companies/:id/views
// @access Public
exports.updateCompanyViews = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const company = await Company.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم زيادة عدد المشاهدات بنجاح');
});
// @desc Search companies by name
// @route GET /api/companies/search
// @access Public
exports.searchCompaniesByName = factory.getAll(Company, 'Company', [
  { path: 'userId', select: 'name email' },
  { path: 'categoryId', select: '_id nameAr nameEn color' }
], ['companyName', 'companyNameEn', 'description', 'descriptionEn']);
