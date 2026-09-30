/**
 * Standardized application error. Every deliberate error thrown in the
 * codebase should be an ApiError so the global error handler can format
 * a consistent JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden: insufficient permissions') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource conflict') {
    return new ApiError(409, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, null, false);
  }
}

module.exports = ApiError;
