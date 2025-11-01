const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");

const Company = require("../model/companyModel");
const ApiError = require("../utils/apiError");
const factory = require("./handlersFactory");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
// Upload single image
exports.uploadCompanyImage = uploadSingleImage("logo");

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
  const filename = `company-${uuidv4()}-${Date.now()}.jpeg`;

  if (req.file) {
    await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/brands/${filename}`);

    // Save image into our db
    req.body.image = filename;
  }

  next();
});
// @desc    Create a new company (subscription request)
// @route   POST /api/companies
// @access  Public
exports.createCompany = factory.createOne(Company);
// [الأدمن] جلب جميع الشركات المسجلة (مع إمكانية الفلترة)
// @route   GET /api/companies
// @desc    يعرض جميع الشركات ويمكن الفلترة حسب الموافقة (?isApproved=false)
exports.getallcompany = factory.getAll(Company);
exports.getOnecompany = factory.getOne(Company);

// @desc    Search companies by name
// @route   PUT /api/companies/update/:id
// @access  protcted
exports.updatecompany = factory.updateOne(Company);
// @desc    Search companies by name
// @route   PUT /api/companies/delete/:id
// @access  protcted
exports.deletecompany = factory.deleteOne(Company);
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
  const companies = await Company.find({
    companyName: { $regex: name, $options: "i" },
    isApproved: true,
  });
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
  const company = await Company.findById(id);
  if (!company) {
    return next(new ApiError("الشركة غير موجودة", 404));
  }
  if (company.isApproved) {
    return next(new ApiError("تمت الموافقة على الشركة مسبقاً", 400));
  }
  company.isApproved = true;
  await company.save();
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
