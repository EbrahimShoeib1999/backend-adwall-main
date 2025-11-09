const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const { check, body } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');
const User = require('../../model/userModel');

/**
 * @desc    Validator for creating a new user
 */
exports.createUserValidator = [
  // Name validation
  check('name')
    .notEmpty()
    .withMessage('اسم المستخدم مطلوب')
    .isLength({ min: 3 })
    .withMessage('الاسم قصير جدًا (الحد الأدنى 3 أحرف)')
    .custom((val, { req }) => {
      req.body.slug = slugify(val, { lower: true });
      return true;
    }),

  // Email validation
  check('email')
    .notEmpty()
    .withMessage('البريد الإلكتروني مطلوب')
    .isEmail()
    .withMessage('عنوان بريد إلكتروني غير صالح')
    .custom((email) =>
      User.findOne({ email }).then((user) => {
        if (user) {
          return Promise.reject(new Error('البريد الإلكتروني مُستخدم بالفعل'));
        }
      })
    ),

  // Password validation
  check('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error('تأكيد كلمة المرور غير متطابق');
      }
      return true;
    }),

  // Password confirmation
  check('passwordConfirm')
    .notEmpty()
    .withMessage('تأكيد كلمة المرور مطلوب'),

  // Phone (optional)
  check('phone')
    .optional()
    .isMobilePhone(['ar-EG', 'ar-SA'])
    .withMessage('رقم الهاتف غير صالح. يُقبل فقط أرقام مصر و السعودية'),

  // Optional fields
  check('profileImg').optional(),
  check('role').optional(),

  validatorMiddleware,
];

/**
 * @desc    Validator for getting a user by ID
 */
exports.getUserValidator = [
  check('id').isMongoId().withMessage('معرف المستخدم غير صالح'),
  validatorMiddleware,
];

/**
 * @desc    Validator for updating user (except password)
 */
exports.updateUserValidator = [
  check('id').isMongoId().withMessage('معرف المستخدم غير صالح'),

  // Name (optional)
  body('name')
    .optional()
    .isLength({ min: 3 })
    .withMessage('الاسم قصير جدًا (الحد الأدنى 3 أحرف)')
    .custom((val, { req }) => {
      req.body.slug = slugify(val, { lower: true });
      return true;
    }),

  // Email (optional but must be valid and unique if provided)
  check('email')
    .optional()
    .isEmail()
    .withMessage('عنوان بريد إلكتروني غير صالح')
    .custom((email) =>
      User.findOne({ email }).then((user) => {
        if (user) {
          return Promise.reject(new Error('البريد الإلكتروني مُستخدم بالفعل'));
        }
      })
    ),

  // Phone (optional)
  check('phone')
    .optional()
    .isMobilePhone(['ar-EG', 'ar-SA'])
    .withMessage('رقم هاتف غير صالح، يُقبل فقط أرقام الهواتف المصرية والسعودية'),

  // Optional fields
  check('profileImg').optional(),
  check('role').optional(),

  validatorMiddleware,
];

/**
 * @desc    Validator for changing user password (Admin or User)
 */
exports.changeUserPasswordValidator = [
  check('id').isMongoId().withMessage('معرف المستخدم غير صالح'),

  // Current password
  body('currentPassword')
    .notEmpty()
    .withMessage('يجب إدخال كلمة المرور الحالية'),

  // New password
  body('password')
    .notEmpty()
    .withMessage('يجب إدخال كلمة المرور الجديدة')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),

  // Password confirmation
  body('passwordConfirm')
    .notEmpty()
    .withMessage('يجب تأكيد كلمة المرور الجديدة'),

  // Custom validation: check current password + confirm new password
  body('password').custom(async (newPassword, { req }) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new Error('لا يوجد مستخدم بهذا المعرف');
    }

    const isCorrectPassword = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    if (!isCorrectPassword) {
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }

    if (newPassword !== req.body.passwordConfirm) {
      throw new Error('تأكيد كلمة المرور غير متطابق');
    }

    return true;
  }),

  validatorMiddleware,
];

/**
 * @desc    Validator for deleting a user
 */
exports.deleteUserValidator = [
  check('id').isMongoId().withMessage('معرف المستخدم غير صالح'),
  validatorMiddleware,
];

/**
 * @desc    Validator for updating logged in user data (name, phone)
 */
exports.updateLoggedUserValidator = [
  body('name')
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val, { lower: true });
      return true;
    }),
  check('phone')
    .optional()
    .isMobilePhone(['ar-EG', 'ar-SA'])
    .withMessage('رقم الهاتف غير صالح. يُقبل فقط أرقام مصر و السعودية'),
  body().custom((value, { req }) => {
    const allowedUpdates = ['name', 'phone'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );
    if (!isValidOperation) {
      throw new Error('لا يمكن تحديث هذه الحقول. يُسمح بتحديث الاسم ورقم الهاتف فقط.');
    }
    return true;
  }),
  validatorMiddleware,
];
