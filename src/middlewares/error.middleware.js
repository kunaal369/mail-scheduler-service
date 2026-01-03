const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

const errorMiddleware = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ValidationError') {
    return errorResponse(res, 400, 'Validation error', err.details);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, 400, 'Validation error', errors);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, 409, 'Resource already exists');
  }

  if (err.name === 'SequelizeDatabaseError') {
    return errorResponse(res, 500, 'Database error');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(res, statusCode, message);
};

module.exports = errorMiddleware;

