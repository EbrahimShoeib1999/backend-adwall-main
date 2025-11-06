const multer = require('multer');
const ApiError = require('../utils/apiError');

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith('video')) {
      cb(null, true);
    } else {
      cb(new ApiError('Only Videos allowed', 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

exports.uploadSingleVideo = (fieldName) => multerOptions().single(fieldName);