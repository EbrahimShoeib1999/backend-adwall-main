// responseHandler.js
const { statusCodes, successMessages, errorMessages } = require('./statusCodes');

/**
 * Sends a standardized success response.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {string} message - The success message.
 * @param {object} data - The data to send in the response.
 */
const sendSuccessResponse = (res, statusCode, message, data = {}) => {
  const response = {
    status: 'success',
    message: message || successMessages[statusCode] || 'تمت العملية بنجاح',
  };

  if (Object.keys(data).length > 0) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Sends a standardized error response.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {string} message - The error message.
 * @param {Array} errors - An array of error details.
 */
const sendErrorResponse = (res, statusCode, message, errors = []) => {
  const response = {
    status: 'error',
    message: message || errorMessages[statusCode] || 'حدث خطأ غير متوقع',
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  statusCodes,
  sendSuccessResponse,
  sendErrorResponse,
};