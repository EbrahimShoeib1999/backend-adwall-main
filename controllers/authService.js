const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");

// @desc    Signup
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  // 1) Create user
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone, // الآن يقبل أي تنسيق لرقم الهاتف
    password: req.body.password,
  });

  // 2) Generate token
  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  // 1) Check if email and password exist
  const { email, password } = req.body;
  
  if (!email || !password) {
    return next(new ApiError('البريد الإلكتروني وكلمة المرور مطلوبان', 400));
  }

  // 2) Check if user exists & password is correct
  // استخدام .select('+password') لإرجاع حقل كلمة المرور المخفي
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new ApiError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401));
  }

  // 3) Generate token
  const token = createToken(user._id);

  // 4) Update last login
  await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

  res.status(200).json({ data: user, token });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError('لا يوجد مستخدم بهذا البريد الإلكتروني', 404));
  }

  // 2) Generate random reset code and save it
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetCode = resetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.passwordResetVerified = false;

  await user.save();

  // 3) Send the reset code via email (هنا يمكنك إضافة إرسال البريد الإلكتروني)
  console.log(`Reset Code: ${resetCode}`);

  res.status(200).json({
    status: 'success',
    message: 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني',
  });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code
  const user = await User.findOne({
    passwordResetCode: req.body.resetCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError('رمز إعادة التعيين غير صالح أو منتهي الصلاحية', 400));
  }

  // 2) Reset code valid
  user.passwordResetVerified = true;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'تم التحقق من رمز إعادة التعيين بنجاح',
  });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError('لا يوجد مستخدم بهذا البريد الإلكتروني', 404));
  }

  // 2) Check if reset code verified
  if (!user.passwordResetVerified) {
    return next(new ApiError('لم يتم التحقق من رمز إعادة التعيين', 400));
  }

  // 3) Update password
  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  // 4) Generate token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Check if token exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new ApiError("You are not login, Please login to get access this route", 401));
  }

  // 2) Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3) Check if user exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }

  // 4) Check if user change his password after token created
  if (currentUser.passwordChangedAt) {
    const passswordChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passswordChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }

  req.user = currentUser;
  next();
});

exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // roles ==> ['admin', 'manager']
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403)
      );
    }
    next();
  });