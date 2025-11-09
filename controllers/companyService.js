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
// @desc    Create a new company (subscription request)
// @route   POST /api/companies
// @access  Public
exports.createCompany = asyncHandler(async (req, res, next) => {
  // Set the userId from the logged-in user
  req.body.userId = req.user._id;
  // New companies are pending approval by default
  req.body.isApproved = false;

  const newDoc = await Company.create(req.body);
  res.status(201).json({
    status: "success",
    data: newDoc,
  });
});
// [الأدمن] جلب جميع الشركات المسجلة (مع إمكانية الفلترة)
// @route   GET /api/companies
// @desc    يعرض جميع الشركات ويمكن الفلترة حسب الموافقة (?isApproved=false)
exports.getAllCompanies = factory.getAll(
  Company,
  "Company",
  [
    { path: "userId", select: "name email" },
    { path: "categoryId", select: "nameAr nameEn color" },
  ]
);
exports.getOneCompany = factory.getOne(Company);

// @desc    Search companies by name
// @route   PUT /api/companies/update/:id
// @access  protcted
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  // Check if the user owns the company or is an admin
  if (company.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new ApiError('You are not allowed to update this company', 403));
  }

  const updatedCompany = await Company.findByIdAndUpdate(id, req.body, { new: true });

  res.status(200).json({ status: "success", data: updatedCompany });
});
// @desc    Delete a company
// @route   DELETE /api/v1/companies/:id
// @access  Protected (User who owns the company or Admin)
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id);

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  // Check if the user owns the company or is an admin
  if (
    company.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new ApiError("You are not allowed to delete this company", 403)
    );
  }

  await Company.findByIdAndDelete(id);

  res.status(204).send();
});
// @desc    Get companies by category
// @route   GET /api/companies/category/:categoryId
// @access  Public
exports.getCompaniesByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const companies = await Company.find({ categoryId, isApproved: true });
  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc    Search companies by name
// @route   GET /api/companies/search?name=اسم_الشركة
// @access  Public
exports.searchCompaniesByName = asyncHandler(async (req, res, next) => {
  const { name } = req.query;
  if (!name) {
    return next(new ApiError("يرجى إدخال اسم الشركة للبحث", 400));
  }
  const searchConditions = {
    $or: [
      { companyName: { $regex: name, $options: "i" } },
      { companyNameEn: { $regex: name, $options: "i" } }, // For English
      { description: { $regex: name, $options: "i" } },
      { descriptionEn: { $regex: name, $options: "i" } }, // For English
    ],
    isApproved: true,
  };

  const companies = await Company.find(searchConditions);

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc    Get all pending companies (admin only)
// @route   GET /api/companies/pending
// @access  Admin
exports.getPendingCompanies = asyncHandler(async (req, res, next) => {
  const pendingCompanies = await Company.find({ isApproved: false });
  res.status(200).json({
    status: "success",
    results: pendingCompanies.length,
    data: pendingCompanies,
  });
});

// @desc    Search companies by city and country
// @route   GET /api/companies/search-location?city=...&country=...
// @access  Public
exports.searchCompaniesByLocation = asyncHandler(async (req, res, next) => {
  const { city, country } = req.query;
  if (!city && !country) {
    return next(new ApiError("يرجى إدخال المدينة أو الدولة للبحث", 400));
  }
  const query = { isApproved: true };
  if (city) query.city = { $regex: city, $options: "i" };
  if (country) query.country = { $regex: country, $options: "i" };

  const companies = await Company.find(query);
  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc    Search companies by category and (city or country)
// @route   GET /api/companies/category/:categoryId/search-location?city=...&country=...
// @access  Public
exports.searchCompaniesByCategoryAndLocation = asyncHandler(
  async (req, res, next) => {
    const { city, country } = req.query;
    const { categoryId } = req.params;
    if (!categoryId) {
      return next(new ApiError("يرجى تحديد الفئة", 400));
    }
    const query = { categoryId, isApproved: true };
    if (city) query.city = { $regex: city, $options: "i" };
    if (country) query.country = { $regex: country, $options: "i" };
    // إذا لم يتم تمرير city أو country، يرجع كل الشركات ضمن الفئة
    const companies = await Company.find(query);
    res.status(200).json({
      status: "success",
      results: companies.length,
      data: companies,
    });
  }
);

// @desc    Admin approve company
// @route   PATCH /api/companies/:id/approve
// @access  Admin
exports.approveCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findById(id).populate('userId', 'name email');
  if (!company) {
    return next(new ApiError("الشركة غير موجودة", 404));
  }
  if (company.isApproved) {
    return next(new ApiError("تمت الموافقة على الشركة مسبقاً", 400));
  }
  company.isApproved = true;
  await company.save();

  // Send notification email to the user
  try {
    if (company.userId) {
      const message = `Hi ${company.userId.name},

Congratulations! Your company "${company.companyName}" has been approved and is now live on AddWall.

Thanks,
The AddWall Team`;
      await sendEmail({
        email: company.userId.email,
        subject: "Your Company has been Approved",
        message,
      });
    }
  } catch (err) {
    // We don't want to fail the request if the email fails.
    // The approval is the most important part.
    // Log the error for debugging purposes.
    console.error(
      `Failed to send approval email for company ${company._id}:`,
      err
    );
  }

  res.status(200).json({
    status: "success",
    message: "تمت الموافقة على الشركة بنجاح",
    data: company,
  });
});

// @desc    Get all companies for a specific user
// @route   GET /api/companies/user/:userId
// @access  Private (User can only access their own companies)
exports.getUserCompanies = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // Check if user is requesting their own companies or is admin
  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", 403));
  }

  const companies = await Company.find({ userId })
    .populate("categoryId", "nameAr nameEn slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc    Get a specific company for a specific user
// @route   GET /api/companies/user/:userId/company/:companyId
// @access  Private (User can only access their own companies)
exports.getUserCompany = asyncHandler(async (req, res, next) => {
  const { userId, companyId } = req.params;

  // Check if user is requesting their own company or is admin
  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركة", 403));
  }

  const company = await Company.findOne({ _id: companyId, userId }).populate(
    "categoryId",
    "nameAr nameEn slug"
  );

  if (!company) {
    return next(new ApiError("الشركة غير موجودة أو لا تنتمي لك", 404));
  }

  res.status(200).json({
    status: "success",
    data: company,
  });
});

// @desc    Get user's companies by status (approved/pending)
// @route   GET /api/companies/user/:userId/status/:status
// @access  Private (User can only access their own companies)
exports.getUserCompaniesByStatus = asyncHandler(async (req, res, next) => {
  const { userId, status } = req.params;

  // Check if user is requesting their own companies or is admin
  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    return next(new ApiError("غير مصرح لك بالوصول إلى هذه الشركات", 403));
  }

  // Validate status parameter
  if (!["approved", "pending"].includes(status)) {
    return next(
      new ApiError("حالة غير صحيحة. يرجى استخدام approved أو pending", 400)
    );
  }

  const isApproved = status === "approved";
  const companies = await Company.find({ userId, isApproved })
    .populate("categoryId", "nameAr nameEn slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: companies,
  });
});

// @desc    Increment view count for a company
// @route   PATCH /api/v1/companies/:id/view
// @access  Public
exports.incrementCompanyView = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const company = await Company.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  res.status(200).json({ status: 'success', message: 'View count incremented' });
});

// @desc    Upload and process video for a VIP company ad
// @route   PATCH /api/v1/companies/:id/video
// @access  Private/Admin
exports.processVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const filename = `company-video-${uuidv4()}-${Date.now()}.mp4`;
  const outputPath = `uploads/videos/${filename}`;

  const readableStream = new stream.PassThrough();
  readableStream.end(req.file.buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(readableStream)
      .toFormat('mp4')
      .outputOptions([
        '-c:v libx264', // Video codec for good compression
        '-preset slow', // Compression preset for better quality/size ratio
        '-crf 28',      // Constant Rate Factor for quality (18-28 is a good range)
        '-c:a aac',     // Audio codec
        '-b:a 128k',    // Audio bitrate
      ])
      .on('end', () => resolve())
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
  );

  if (!company) {
    return next(new ApiError(`No company for this id ${id}`, 404));
  }

  res.status(200).json({ status: 'success', data: company });
});
