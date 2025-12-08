const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");
const slugify = require("slugify");
const fs = require('fs');
const path = require('path');

const factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const createToken = require("../utils/createToken");
const User = require("../model/userModel");
const Plan = require('../model/planModel');
const { sendSuccessResponse, statusCodes } = require("../utils/responseHandler");
const { deleteImage } = require('../utils/fileHelper');

exports.uploadUserImage = uploadSingleImage("profileImg");

exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const uploadsDir = path.join('uploads', 'users');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;
  const outputPath = path.join(uploadsDir, filename);

  await sharp(req.file.path)
    .resize(600, 600)
    .toFormat("jpeg")
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  // حذف الملف المؤقت
  fs.unlinkSync(req.file.path);

  req.body.profileImg = filename;
  next();
});

exports.getUsers = factory.getAll(User, 'User', [], ['name', 'email']);
exports.getUser = factory.getOne(User);
exports.createUser = factory.createOne(User);

// @desc    Update specific user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // إذا كان هناك صورة جديدة، احذف القديمة
  if (req.body.profileImg && user.profileImg && user.profileImg !== 'default-profile.png') {
    await deleteImage('users', user.profileImg);
  }

  const document = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      profileImg: req.body.profileImg,
      role: req.body.role,
    },
    {
      new: true,
    }
  );

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث بيانات المستخدم بنجاح', {
    data: document,
  });
});

exports.changeUserPassword = asyncHandler(async (req, res, next) => {
  const document = await User.findByIdAndUpdate(
    req.params.id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!document) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم تغيير كلمة المرور بنجاح. سيحتاج المستخدم إلى تسجيل الدخول مرة أخرى.', {
    data: document,
    message: 'تم تحديث كلمة المرور. يجب على المستخدم تسجيل الدخول مرة أخرى للحصول على token جديد.'
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
  }

  // حذف الصورة المرتبطة إذا وجدت
  if (user.profileImg && user.profileImg !== 'default-profile.png') {
    await deleteImage('users', user.profileImg);
  }

  await User.findByIdAndDelete(req.params.id);
  
  sendSuccessResponse(res, statusCodes.NO_CONTENT);
});

// @desc    Set role to admin
// @route   POST  /api/v1/users/admins
// @access  Private/Admin
exports.createAdmin = (req, res, next) => {
  req.body.role = "admin";
  next();
};

// @desc    Get Logged user data
// @route   GET /api/v1/users/getMe
// @access  Private/Protect
exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate({
    path: 'subscription.plan',
    select: 'name planType options', // Select relevant fields from the plan
  });

  if (!user) {
    return next(new ApiError('User not found', statusCodes.NOT_FOUND));
  }

  let planDetails = {};
  if (user.subscription && user.subscription.plan && user.subscription.option) {
    const populatedPlan = user.subscription.plan;
    const currentOption = populatedPlan.options.id(user.subscription.option);

    if (currentOption) {
      const totalAds = currentOption.adsCount;
      const adsUsed = user.subscription.adsUsed;
      const adsRemaining = totalAds - adsUsed;

      planDetails = {
        planName: populatedPlan.name,
        planType: populatedPlan.planType,
        planDuration: currentOption.duration,
        planPrice: currentOption.finalPriceUSD,
        totalAds: totalAds,
        adsUsed: adsUsed,
        adsRemaining: adsRemaining,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        isActive: user.subscription.isActive,
      };
    }
  }

  sendSuccessResponse(res, statusCodes.OK, 'User data retrieved successfully', {
    user: {
      ...user.toObject(), // Convert mongoose document to JS object
      planDetails: planDetails,
    },
  });
});

// @desc    Update logged user password
// @route   PUT /api/v1/users/updateMyPassword
// @access  Private/Protect
exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  const token = createToken(user._id);

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث كلمة المرور بنجاح. يرجى استخدام الـ token الجديد في جميع الطلبات اللاحقة.', {
    data: user,
    token,
    tokenUpdated: true,
    message: 'تم إنشاء token جديد. يجب تحديث الـ token المحفوظ في الـ Frontend.'
  });
});

// @desc    Update logged user data (without password, role)
// @route   PUT /api/v1/users/updateMe
// @access  Private/Protect
exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
  const updateData = {};
  if (req.body.name) {
    updateData.name = req.body.name;
    updateData.slug = slugify(req.body.name, { lower: true });
  }
  if (req.body.phone) {
    updateData.phone = req.body.phone;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
  });

  sendSuccessResponse(res, statusCodes.OK, 'تم تحديث بياناتك بنجاح', {
    data: updatedUser,
  });
});

// @desc    Deactivate logged user
// @route   DELETE /api/v1/users/deleteMe
// @access  Private/Protect
exports.deleteLoggedUserData = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  sendSuccessResponse(res, statusCodes.NO_CONTENT);
});

exports.assignPlanToUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { planId, optionId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, statusCodes.NOT_FOUND));
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new ApiError(`لا توجد باقة بهذا المعرف ${planId}`, statusCodes.NOT_FOUND));
  }

  const planOption = plan.options.id(optionId);
  if (!planOption) {
    return next(new ApiError(`لا يوجد خيار باقة بهذا المعرف ${optionId}`, statusCodes.NOT_FOUND));
  }

  const durationInMonths = parseInt(planOption.duration.split(' ')[0]);
  const startDate = new Date();
  const endDate = new Date(new Date().setMonth(startDate.getMonth() + durationInMonths));

  user.subscription = {
    plan: plan._id,
    option: planOption._id,
    startDate: new Date(),
    endDate: endDate,
    adsUsed: 0,
    isActive: true,
  };

  await user.save();

  sendSuccessResponse(res, statusCodes.OK, `تم تعيين الباقة '${plan.name}' - '${planOption.duration}' للمستخدم '${user.name}' بنجاح`, {
    data: user,
  });
});

// @desc    Get users statistics
// @route   GET /api/v1/users/stats
// @access  Private/Admin
const Company = require('../model/companyModel');

// @desc    Get analytics for the logged-in user
// @route   GET /api/v1/users/my-analytics
// @access  Private/Protect
exports.getUserAnalytics = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const [
    totalAds,
    pendingAds,
    approvedAds,
    rejectedAds,
    totalViewsResult,
    activeAdsList,
  ] = await Promise.all([
    Company.countDocuments({ userId }),
    Company.countDocuments({ userId, status: 'pending' }),
    Company.countDocuments({ userId, status: 'approved' }),
    Company.countDocuments({ userId, status: 'rejected' }),
    Company.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } },
    ]),
    Company.find({ userId, status: 'approved' }),
  ]);

  const totalViews = totalViewsResult.length > 0 ? totalViewsResult[0].totalViews : 0;

  const chartData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    data: [pendingAds, approvedAds, rejectedAds],
  };

  sendSuccessResponse(res, statusCodes.OK, 'User analytics retrieved successfully', {
    data: {
      totalAds,
      pendingAds,
      approvedAds,
      rejectedAds,
      totalViews,
      activeAdsList,
      chartData,
    },
  });
});

exports.getUsersStats = asyncHandler(async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminsCount = await User.countDocuments({ role: "admin" });
    const regularUsersCount = await User.countDocuments({ role: "user" });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeThisWeek = await User.countDocuments({
      $or: [
        { lastLogin: { $gte: sevenDaysAgo } },
        { createdAt: { $gte: sevenDaysAgo } },
      ],
    });

    const stats = {
      totalUsers,
      adminsCount,
      regularUsersCount,
      activeThisWeek,
      adminPercentage:
        totalUsers > 0 ? ((adminsCount / totalUsers) * 100).toFixed(1) : 0,
      regularUserPercentage:
        totalUsers > 0
          ? ((regularUsersCount / totalUsers) * 100).toFixed(1)
          : 0,
      activePercentage:
        totalUsers > 0 ? ((activeThisWeek / totalUsers) * 100).toFixed(1) : 0,
    };

    sendSuccessResponse(res, statusCodes.OK, 'تم جلب إحصائيات المستخدمين بنجاح', {
      data: stats,
    });
  } catch (error) {
    return next(
      new ApiError(`خطأ في جلب إحصائيات المستخدمين: ${error.message}`, statusCodes.INTERNAL_SERVER_ERROR)
    );
  }
});