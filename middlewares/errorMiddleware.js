const ApiError = require('../utils/apiError');
const { sendErrorResponse, statusCodes } = require('../utils/responseHandler');

const sendErrorForDev = (err, res) =>
  sendErrorResponse(res, err.statusCode, err.message, {
    error: err,
    stack: err.stack,
  });

const sendErrorForProd = (err, res) =>
  sendErrorResponse(res, err.statusCode, err.message);

const handleJwtInvalidSignature = () =>
  new ApiError('Invalid token, please login again..', statusCodes.UNAUTHORIZED);

const handleJwtExpired = () =>
  new ApiError('Expired token, please login again..', statusCodes.UNAUTHORIZED);

const globalError = (err, req, res, next) => {
  if (err instanceof ApiError) {
    err.statusCode = err.statusCode;
    err.status = err.status;
  } else {
    err.statusCode = 500;
    err.status = 'error';
  }
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorForDev(err, res);
  } else {
    if (err.name === 'JsonWebTokenError') err = handleJwtInvalidSignature();
    if (err.name === 'TokenExpiredError') err = handleJwtExpired();
    sendErrorForProd(err, res);
  }
};

module.exports = globalError;
