// authService.js
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const sendEmail = require('../utils/sendEmail');
const { sendSuccessResponse, statusCodes } = require("../utils/responseHandler");

// @desc    Signup
// @route   POST /api/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email.trim().toLowerCase(),
    phone: req.body.phone,
    password: req.body.password,
  });

  const token = createToken(user._id);

  sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء الحساب بنجاح', { 
    data: user, 
    token 
  });
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  
  if (!email || !password) {
    return next(new ApiError('البريد الإلكتروني وكلمة المرور مطلوبان', statusCodes.BAD_REQUEST));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new ApiError('البريد الإلكتروني أو كلمة المرور غير صحيحة', statusCodes.UNAUTHORIZED));
  }

  const token = createToken(user._id);

  sendSuccessResponse(res, statusCodes.OK, 'تم تسجيل الدخول بنجاح', { 
    data: user, 
    token 
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }); // findOne لإرجاع مستند واحد
  console.log(user);

  if (!user) {
    return next(new ApiError('لا يوجد مستخدم مسجل بهذا البريد الإلكتروني', statusCodes.NOT_FOUND));
  }

  // إنشاء رمز إعادة التعيين
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetCode = resetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 دقائق
  user.passwordResetVerified = false;

  await user.save();

  try {
    await sendEmail({
      email: user.email,
      subject: 'رمز إعادة تعيين كلمة المرور (صالح لمدة 10 دقائق)',
      message: `مرحبًا ${user.name},\n\nلقد تلقينا طلبًا لإعادة تعيين كلمة المرور.\n\nأدخل هذا الرمز لإكمال العملية:\n\n${resetCode}\n\nشكرًا لك,\nفريق Ad-Wall`,
    });
  } catch (err) {
    // إعادة تعيين القيم إذا فشل الإرسال
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    return next(new ApiError('حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة لاحقًا.', statusCodes.INTERNAL_SERVER_ERROR));
  }

  sendSuccessResponse(res, statusCodes.OK, 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني');
});


// @desc    Verify password reset code
// @route   POST /api/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  const resetCode = req.body.resetCode?.trim();
  const user = await User.findOne({
    passwordResetCode: resetCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError('رمز إعادة التعيين غير صالح أو انتهت صلاحيته', statusCodes.BAD_REQUEST));
  }

  user.passwordResetVerified = true;
  await user.save();

  sendSuccessResponse(res, statusCodes.OK, 'تم التحقق من رمز إعادة التعيين بنجاح');
});

// @desc    Reset password
// @route   POST /api/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError('لا يوجد مستخدم مسجل بهذا البريد الإلكتروني', statusCodes.NOT_FOUND));
  }

  if (!user.passwordResetVerified) {
    return next(new ApiError('لم يتم التحقق من رمز إعادة التعيين', statusCodes.BAD_REQUEST));
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  const token = createToken(user._id);

  sendSuccessResponse(res, statusCodes.OK, 'تم إعادة تعيين كلمة المرور بنجاح', { 
    data: user, 
    token 
  });
});

// Middleware لحماية المسارات
exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new ApiError("غير مصرح بالدخول، يرجى تسجيل الدخول للوصول إلى هذا المسار", statusCodes.UNAUTHORIZED));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(new ApiError("المستخدم المرتبط بهذا الرمز لم يعد موجوداً", statusCodes.UNAUTHORIZED));
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
    if (passChangedTimestamp > decoded.iat) {
      return next(new ApiError("قام المستخدم بتغيير كلمة المرور مؤخراً، يرجى تسجيل الدخول مرة أخرى", statusCodes.UNAUTHORIZED));
    }
  }

  req.user = currentUser;
  next();
});

// Middleware لتحديد الأدوار المسموح لها
exports.allowedTo = (...roles) => asyncHandler(async (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError("غير مصرح لك بتنفيذ هذا الإجراء", statusCodes.FORBIDDEN));
  }
  next();
});

// Google OAuth Callback
exports.googleCallback = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.token) {
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/login-failure`);
  }
});

// @desc    Get Google Client ID
// @route   GET /api/auth/google/client-id
// @access  Public
exports.getGoogleClientId = asyncHandler(async (req, res, next) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  sendSuccessResponse(res, statusCodes.OK, 'Google Client ID retrieved successfully', { 
    clientId 
  });
});

// @desc    Verify Google Login (from Frontend)
// @route   POST /api/auth/google
// @access  Public
exports.verifyGoogle = asyncHandler(async (req, res, next) => {
  const { email, name, picture, sub } = req.body;

  if (!email) {
    return next(new ApiError('البريد الإلكتروني مطلوب', statusCodes.BAD_REQUEST));
  }

  let user = await User.findOne({ email });

  if (!user) {
    // Create new user
    user = await User.create({
      name: name || email.split('@')[0],
      email: email,
      profileImg: picture,
      googleId: sub,
      password: Math.random().toString(36).slice(-8), // Random password
    });
  } else {
    // Update existing user info if needed
    if (!user.googleId) {
      user.googleId = sub;
      if (picture && (!user.profileImg || user.profileImg === 'default-profile.png')) {
        user.profileImg = picture;
      }
      await user.save();
    }
  }

  const token = createToken(user._id);

  // Return format matching frontend expectation: { success: true, user, token }
  // Note: sendSuccessResponse wraps data in a 'data' field usually, but let's match frontend
  // Frontend expects: res.data.user and res.data.token directly from axios response
  
  // Using sendSuccessResponse but ensuring structure matches
  res.status(200).json({
    status: 'success',
    user,
    token
  });
});
