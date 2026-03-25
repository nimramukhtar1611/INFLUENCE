// middleware/errorHandler.js - COMPLETE PRODUCTION-READY VERSION
const mongoose = require('mongoose');
const { ValidationError } = require('express-validator');

// ==================== CUSTOM ERROR CLASSES ====================

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError_ extends AppError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

// ==================== ERROR HANDLER MIDDLEWARE ====================

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('🔥 Error:', {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: err.code,
    },
  });

  // Default error
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.code = err.code || 'INTERNAL_ERROR';

  // ==================== MONGOOSE ERRORS ====================

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, 'INVALID_ID');
  }

  // ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    error = new ValidationError_(errors);
  }

  // Duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 409, 'DUPLICATE_KEY');
  }

  // ==================== JWT ERRORS ====================

  // Invalid token
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  // Token expired
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // ==================== EXPRESS-VALIDATOR ERRORS ====================

  if (err instanceof ValidationError) {
    const errors = err.array().map(e => ({
      field: e.path,
      message: e.msg,
    }));
    error = new ValidationError_(errors);
  }

  // ==================== MULTER ERRORS ====================

  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new AppError('Too many files', 400, 'TOO_MANY_FILES');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected field', 400, 'UNEXPECTED_FIELD');
  }

  // ==================== RATE LIMIT ERRORS ====================

  if (err.code === 'RATE_LIMIT') {
    error = new TooManyRequestsError(err.message);
  }

  // ==================== CORS ERRORS ====================

  if (err.message.includes('Not allowed by CORS')) {
    error = new AppError('CORS error: Origin not allowed', 403, 'CORS_ERROR');
  }

  // ==================== NETWORK/TIMEOUT ERRORS ====================

  if (err.code === 'ECONNABORTED') {
    error = new AppError('Request timeout', 408, 'TIMEOUT');
  }

  // ==================== STRIPE ERRORS ====================

  if (err.type && err.type.startsWith('Stripe')) {
    error = new AppError(err.message, 400, 'PAYMENT_ERROR');
  }

  // ==================== TWILIO ERRORS ====================

  if (err.code && err.code.toString().startsWith('20')) {
    error = new AppError('SMS service error', 500, 'SMS_ERROR');
  }

  // ==================== RESPONSE FORMAT ====================

  const response = {
    success: false,
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
  };

  // Add validation errors if any
  if (error.errors) {
    response.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.fullError = err;
  }

  // Add request ID for tracking
  response.requestId = req.id;

  res.status(error.statusCode).json(response);
};

// ==================== 404 NOT FOUND HANDLER ====================

const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};

// ==================== ASYNC WRAPPER ====================

/**
 * Wraps an async function to catch errors and pass them to Express
 * @param {Function} fn - Async function
 * @returns {Function} Express middleware
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// ==================== EXPORTS ====================

module.exports = {
  // Main error handler
  errorHandler,
  notFound,
  catchAsync,

  // Error classes
  AppError,
  NotFoundError,
  ValidationError: ValidationError_,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  TooManyRequestsError,
};