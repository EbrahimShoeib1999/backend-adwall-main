const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء المجلدات إذا لم تكن موجودة
const ensureUploadsDir = () => {
  const dirs = [
    'uploads',
    'uploads/users',
    'uploads/categories',
    'uploads/companies',
    'uploads/videos'
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadsDir();

// إعداد multer للتخزين على القرص
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profileImg') {
      uploadPath = 'uploads/users/';
    } else if (file.fieldname === 'image') {
      uploadPath = 'uploads/categories/';
    } else if (file.fieldname === 'logo') {
      uploadPath = 'uploads/companies/';
    } else if (file.fieldname === 'video') {
      uploadPath = 'uploads/videos/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

exports.uploadSingleImage = (fieldName) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB للصور
    }
  }).single(fieldName);
};

exports.uploadMultipleImages = (fieldName, maxCount = 5) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  }).array(fieldName, maxCount);
};