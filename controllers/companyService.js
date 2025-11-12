const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const asyncHandler = require("express-async-handler");

const Company = require("../model/companyModel");
const User = require("../model/userModel");
const ApiError = require("../utils/apiError");
const factory = require("./handlersFactory");
const sendEmail = require("../utils/sendEmail");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");

// Upload single image
exports.uploadCompanyImage = uploadSingleImage("logo");

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
  const filename = `company-${uuidv4()}-${Date.now()}.jpeg`;

  if (req.file) {
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toBuffer();

    req.body.logo = processedImageBuffer;
  }

  next();
});

// @desc Create a new company (subscription request)
// @route POST /api/companies
// @access Public
exports.createCompany = asyncHandler(async (req, res, next) => {
  req.body.userId = req.user._id;
  const newDoc = await Company.create(req.body);
  res.status(201).json({
    status: "success",
    data: newDoc,
  });
});

// [الأدمن] جلب جميع الشركات المسجلة (مع إمكانية الفلترة)
exports.getAllCompanies = asyncHandler(async (req, res, next) => {
  let companies = await Company.find()
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc Get one company (with categoryId.id)
exports.getOneCompany = asyncHandler(async (req, res, next) => {
  let company = await Company.findById(req.params.id)
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (!company) {
    return next(new ApiError(`No company for this id ${req.params.id}`, 404));
  }

  if (company.categoryId && company.categoryId._id) {
    const { _id, ...rest } = company.categoryId;
    company.categoryId = { id: _id.toString(), ...rest };
  }

  res.status(200).json({
    status: "success",
    data: company,
  });
});

// @desc Update company
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  if (company.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new ApiError('You are not allowed to update this company', 403));
  }

  const updatedCompany = await Company.findByIdAndUpdate(id, req.body, { new: true })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (updatedCompany.categoryId && updatedCompany.categoryId._id) {
    const { _id, ...rest } = updatedCompany.categoryId;
    updatedCompany.categoryId = { id: _id.toString(), ...rest };
  }

  res.status(200).json({ status: "success", data: updatedCompany });
});

// @desc Delete company
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  if (company.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new ApiError("You are not allowed to delete this company", 403));
  }

  await Company.findByIdAndDelete(id);
  res.status(204).send();
});

// @desc Get companies by category
exports.getCompaniesByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  let companies = await Company.find({ categoryId, status: "approved" })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc Search companies by name
exports.searchCompaniesByName = asyncHandler(async (req, res, next) => {
  const { name } = req.query;
  if (!name) {
    return next(new ApiError("يرجى إدخال اسم الشركة للبحث", 400));
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
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc Get all pending companies (admin only)
exports.getPendingCompanies = asyncHandler(async (req, res, next) => {
  let pendingCompanies = await Company.find({ status: "pending" })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  pendingCompanies = pendingCompanies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: pendingCompanies.length,
    data: pendingCompanies,
  });
});

// @desc Search companies by city and country
exports.searchCompaniesByLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  if (!city && !country) {
    return next(new ApiError("يرجى إدخال المدينة أو الدولة للبحث", 400));
  }

  const query = { status: "approved" };
  if (city) query.city = { $regex: city, $options: "i" };
  if (country) query.country = { $regex: country, $options: "i" };

  let companies = await Company.find(query)
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc Search companies by category and location
exports.searchCompaniesByCategoryAndLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  const { categoryId } = req.params;

  if (!categoryId) {
    return next(new ApiError("يرجى تحديد الفئة", 400));
  }

  const query = { categoryId, status: "approved" };
  if (city) query.city = { $regex: city, $options: "i" };
  if (country) query.country = { $regex: country, $options: "i" };

  let companies = await Company.find(query)
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
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
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (!updatedCompany) {
    const company = await Company.findById(id);
    if (!company) return next(new ApiError("الشركة غير موجودة", 404));
    return next(new ApiError("تمت الموافقة على الشركة مسبقاً", 400));
  }

  if (updatedCompany.categoryId && updatedCompany.categoryId._id) {
    const { _id, ...rest } = updatedCompany.categoryId;
    updatedCompany.categoryId = { id: _id.toString(), ...rest };
  }

  try {
    if (updatedCompany.userId) {
      const message = `Hi ${updatedCompany.userId.name},\n\nCongratulations! Your company "${updatedCompany.companyName}" has been approved and is now live on AddWall.\n\nThanks,\nThe AddWall Team`;
      await sendEmail({
        email: updatedCompany.userId.email,
        subject: "Your Company has been Approved",
        message,
      });
    }
  } catch (err) {
    console.error(`Failed to send approval email:`, err);
  }

  res.status(200).json({
    status: "success",
    message: "تمت الموافقة على الشركة بنجاح",
    data: updatedCompany,
  });
});

// @desc Admin reject company
exports.rejectCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return next(new ApiError("يرجى تقديم سبب الرفض", 400));
  }

  const company = await Company.findById(id)
    .populate('userId', 'name email')
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (!company) return next(new ApiError("الشركة غير موجودة", 404));
  if (company.status === 'rejected') return next(new ApiError("تم رفض الشركة مسبقاً", 400));

  await Company.findByIdAndUpdate(id, { status: 'rejected', rejectionReason: reason });

  if (company.categoryId && company.categoryId._id) {
    const { _id, ...rest } = company.categoryId;
    company.categoryId = { id: _id.toString(), ...rest };
  }

  try {
    if (company.userId) {
      const message = `Hi ${company.userId.name},\n\nWe regret to inform you that your company submission "${company.companyName}" has been rejected for the following reason:\n${reason}\n\nIf you have any questions, please contact our support team.\n\nThanks,\nThe AddWall Team`;
      await sendEmail({
        email: company.userId.email,
        subject: "Your Company Submission Status",
        message,
      });
    }
  } catch (err) {
    console.error(`Failed to send rejection email:`, err);
  }

  res.status(200).json({
    status: "success",
    message: "تم رفض الشركة بنجاح",
    data: company,
  });
});

// @desc Get all companies for a specific user
exports.getUserCompanies = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", 403));
  }

  let companies = await Company.find({ userId })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .sort({ createdAt: -1 })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc Get a specific company for a specific user
exports.getUserCompany = asyncHandler(async (req, res, next) => {
  const { userId, companyId } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركة", 403));
  }

  let company = await Company.findOne({ _id: companyId, userId })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (!company) {
    return next(new ApiError("الشركة غير موجودة أو لا تنتمي لك", 404));
  }

  if (company.categoryId && company.categoryId._id) {
    const { _id, ...rest } = company.categoryId;
    company.categoryId = { id: _id.toString(), ...rest };
  }

  res.status(200).json({
    status: "success",
    data: company,
  });
});

// @desc Get user's companies by status
exports.getUserCompaniesByStatus = asyncHandler(async (req, res, next) => {
  const { userId, status } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", 403));
  }

  if (!["approved", "pending", "rejected"].includes(status)) {
    return next(new ApiError("حالة غير صحيحة", 400));
  }

  let companies = await Company.find({ userId, status })
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .sort({ createdAt: -1 })
    .lean();

  companies = companies.map(company => {
    if (company.categoryId && company.categoryId._id) {
      const { _id, ...rest } = company.categoryId;
      company.categoryId = { id: _id.toString(), ...rest };
    }
    return company;
  });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
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
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  res.status(200).json({ status: 'success', message: 'View count incremented' });
});

// @desc Process video upload
exports.processVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `company-video-${uuidv4()}-${Date.now()}.mp4`;
  const outputPath = `uploads/videos/${filename}`;
  const readableStream = new stream.PassThrough();
  readableStream.end(req.file.buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(readableStream)
      .toFormat('mp4')
      .outputOptions([
        '-c:v libx264',
        '-preset slow',
        '-crf 28',
        '-c:a aac',
        '-b:a 128k',
      ])
      .on('end', resolve)
      .on('error', (err) => reject(new ApiError(`Video processing failed: ${err.message}`, 500)))
      .save(outputPath);
  });

  req.body.video = filename;
  next();
});

exports.updateCompanyVideo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const company = await Company.findByIdAndUpdate(
    id,
    { video: req.body.video },
    { new: true }
  )
    .populate({ path: "categoryId", select: "nameAr nameEn color _id" })
    .lean();

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  if (company.categoryId && company.categoryId._id) {
    const { _id, ...rest } = company.categoryId;
    company.categoryId = { id: _id.toString(), ...rest };
  }

  res.status(200).json({ status: 'success', data: company });
});