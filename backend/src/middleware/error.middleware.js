const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../config/logger');
const env = require('../config/env');

/** 404 handler for unmatched routes — must be registered after all routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Maps known Prisma error codes to friendly, correct HTTP responses. */
function mapPrismaError(err) {
  if (err.code === 'P2002') {
    const fields = err.meta?.target?.join(', ') || 'field';
    return ApiError.conflict(`A record with this ${fields} already exists.`);
  }
  if (err.code === 'P2025') {
    return ApiError.notFound('Record not found.');
  }
  if (err.code === 'P2003') {
    return ApiError.badRequest('This action violates a related record constraint (foreign key).');
  }
  return null;
}

/** Centralized error handler — every thrown/next(err) call lands here. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (err.code && err.code.startsWith('P')) {
    error = mapPrismaError(err) || ApiError.internal('Database error occurred.');
  }

  if (err.name === 'JsonWebTokenError') error = ApiError.unauthorized('Invalid token.');
  if (err.name === 'TokenExpiredError') error = ApiError.unauthorized('Token expired.');

  if (!(error instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Internal server error', null, false);
  }

  if (!error.isOperational || error.statusCode >= 500) {
    logger.error(`${error.statusCode} - ${error.message}\n${err.stack}`);
  } else {
    logger.warn(`${error.statusCode} - ${error.message}`);
  }

  const response = new ApiResponse(error.statusCode, error.details || null, error.message);
  if (env.NODE_ENV === 'development' && error.statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
}

module.exports = { notFound, errorHandler };
