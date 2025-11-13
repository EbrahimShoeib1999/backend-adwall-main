// statusCodes.js
const statusCodes = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,

  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const successMessages = {
  200: 'تمت العملية بنجاح',
  201: 'تم الإنشاء بنجاح',
  204: 'تم الحذف بنجاح',
};

const errorMessages = {
  400: 'طلب غير صالح',
  401: 'غير مصرح',
  403: 'ممنوع الوصول',
  404: 'غير موجود',
  409: 'تعارض',
  422: 'كيان غير قابل للمعالجة',
  500: 'خطأ داخلي في الخادم',
  503: 'الخدمة غير متاحة',
};

module.exports = {
  statusCodes,
  successMessages,
  errorMessages,
};