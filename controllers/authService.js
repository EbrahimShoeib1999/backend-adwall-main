// authService.js
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { sendSuccessResponse, statusCodes } = require("../utils/responseHandler");

// @desc    Signup
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
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
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  
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
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError('لا يوجد مستخدم مسجل بهذا البريد الإلكتروني', statusCodes.NOT_FOUND));
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetCode = resetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  sendSuccessResponse(res, statusCodes.OK, 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني');
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({
    passwordResetCode: req.body.resetCode,
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
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError('لا يوجد مستخدم مسجل بهذا البريد الإلكتروني', statusCodes.NOT_FOUND));
  }

  if (!user.passwordResetVerified) {
    return next(new ApiError('لم يتم التحقق من رمز إعادة التعيين', statusCodes.BAD_REQUEST));
  }

  user.password = await bcrypt.hash(req.body.newPassword, 12);
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

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new ApiError("غير مصرح بالدخول، يرجى تسجيل الدخول للوصول إلى هذا المسار", statusCodes.UNAUTHORIZED));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError(
        "المستخدم المرتبط بهذا الرمز لم يعد موجوداً",
        statusCodes.UNAUTHORIZED
      )
    );
  }

  if (currentUser.passwordChangedAt) {
    const passswordChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passswordChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "قام المستخدم بتغيير كلمة المرور مؤخراً، يرجى تسجيل الدخول مرة أخرى",
          statusCodes.UNAUTHORIZED
        )
      );
    }
  }

  req.user = currentUser;
  next();
});

exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("غير مصرح لك بتنفيذ هذا الإجراء", statusCodes.FORBIDDEN)
      );
    }
    next();
  });

// @desc    Google OAuth Callback Handler
// @route   GET /api/v1/auth/google/callback
// @access  Public (handled by Passport)
exports.googleCallback = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.token) {
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${req.user.token}`);
  } else {
    // Handle cases where authentication failed or token is missing
    res.redirect(`${process.env.FRONTEND_URL}/login-failure`); // Redirect to a failure page
  }
});