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
exports.getAllCompanies = asyncHandler(async (req, res, next) => {
  let companies = await Company.find()
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب جميع الشركات بنجاح', {
    results: companies.length,
    data: companies,
  });
});

// @desc Get one company
exports.getOneCompany = asyncHandler(async (req, res, next) => {
  let company = await Company.findById(req.params.id)
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  if (!company) {
    return next(new ApiError(`لا توجد شركة بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // Increment view count after successfully finding the company
  await Company.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });

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
  const { categoryId } = req.params;
  let companies = await Company.find({ categoryId, status: "approved" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب الشركات حسب الفئة بنجاح', {
    results: companies.length,
    data: companies,
  });
});

// @desc Search companies by name
exports.searchCompaniesByName = asyncHandler(async (req, res, next) => {
  const { name } = req.query;
  if (!name) {
    return next(new ApiError("يرجى إدخال اسم الشركة للبحث", statusCodes.BAD_REQUEST));
  }

  const searchConditions = {
    $or: [
      { companyName: { $regex: name, $options: "i" } },
      { companyNameEn: { $regex: name, $options: "i" } },
      { description: { $regex: name, $options: "i" } },
      { descriptionEn: { $regex: name, $options: "i" } },
    ],
    status: "approved",
  };

  let companies = await Company.find(searchConditions)
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم البحث في الشركات بنجاح', {
    results: companies.length,
    data: companies,
  });
});

// @desc Get all pending companies (admin only)
exports.getPendingCompanies = asyncHandler(async (req, res, next) => {
  let pendingCompanies = await Company.find({ status: "pending" })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  pendingCompanies = formatCompanies(pendingCompanies);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب الشركات المعلقة بنجاح', {
    results: pendingCompanies.length,
    data: pendingCompanies,
  });
});

// @desc Search companies by city and country
exports.searchCompaniesByLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  if (!city && !country) {
    return next(new ApiError("يرجى إدخال المدينة أو الدولة للبحث", statusCodes.BAD_REQUEST));
  }

  const query = { status: "approved" };
  if (city) query.city = { $regex: city, $options: "i" };
  if (country) query.country = { $regex: country, $options: "i" };

  let companies = await Company.find(query)
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم البحث في الشركات حسب الموقع بنجاح', {
    results: companies.length,
    data: companies,
  });
});

// @desc Search companies by category and location
exports.searchCompaniesByCategoryAndLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  const { categoryId } = req.params;

  if (!categoryId) {
    return next(new ApiError("يرجى تحديد الفئة", statusCodes.BAD_REQUEST));
  }

  const query = { categoryId, status: "approved" };
  if (city) query.city = { $regex: city, $options: "i" };
  if (country) query.country = { $regex: country, $options: "i" };

  let companies = await Company.find(query)
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم البحث في الشركات حسب الفئة والموقع بنجاح', {
    results: companies.length,
    data: companies,
  });
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

  let companies = await Company.find({ userId })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .sort({ createdAt: -1 })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, 'تم جلب شركات المستخدم بنجاح', {
    results: companies.length,
    data: companies,
  });
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

  let companies = await Company.find({ userId, status })
    .populate({ path: "categoryId", select: "_id nameAr nameEn color" })
    .sort({ createdAt: -1 })
    .lean();

  companies = formatCompanies(companies);

  sendSuccessResponse(res, statusCodes.OK, `تم جلب الشركات بحالة ${status} بنجاح`, {
    results: companies.length,
    data: companies,
  });
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