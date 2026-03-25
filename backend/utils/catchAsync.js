// utils/catchAsync.js - COMPLETE FIXED VERSION

/**
 * Wraps an async function to catch errors and pass them to Express error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Wraps an async function with custom error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Options for error handling
 * @returns {Function} Express middleware function
 */
const catchAsyncWithOptions = (fn, options = {}) => {
  const {
    logError = true,
    defaultMessage = 'An error occurred',
    errorCode = 500
  } = options;

  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (logError) {
        console.error('❌ Async error:', {
          message: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          userId: req.user?._id
        });
      }

      // Pass to Express error handler
      next(error);
    }
  };
};

/**
 * Wraps a controller function with error handling
 * @param {Function} controller - Controller function
 * @returns {Function} Wrapped controller
 */
const wrapController = (controller) => {
  const wrapped = {};
  
  Object.keys(controller).forEach(key => {
    if (typeof controller[key] === 'function') {
      wrapped[key] = catchAsync(controller[key]);
    } else {
      wrapped[key] = controller[key];
    }
  });
  
  return wrapped;
};

/**
 * Wraps all methods of a service class with error handling
 * @param {Object} service - Service object
 * @returns {Object} Wrapped service
 */
const wrapService = (service) => {
  const wrapped = {};
  
  Object.getOwnPropertyNames(Object.getPrototypeOf(service)).forEach(key => {
    if (typeof service[key] === 'function' && key !== 'constructor') {
      wrapped[key] = async (...args) => {
        try {
          return await service[key].apply(service, args);
        } catch (error) {
          console.error(`❌ Service error in ${key}:`, error);
          throw error;
        }
      };
    }
  });
  
  // Copy properties
  Object.assign(wrapped, service);
  
  return wrapped;
};

/**
 * Creates a safe async function that never throws
 * @param {Function} fn - Async function
 * @param {*} defaultValue - Default value on error
 * @returns {Function} Safe function
 */
const safeAsync = (fn, defaultValue = null) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('❌ Safe async error:', error);
      return defaultValue;
    }
  };
};

/**
 * Retry an async function on failure
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of function
 */
const retryAsync = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

/**
 * Timeout wrapper for async functions
 * @param {Function} fn - Async function
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} Result of function
 */
const timeoutAsync = (fn, timeoutMs = 5000, errorMessage = 'Operation timed out') => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
};

/**
 * Creates a debounced async function
 * @param {Function} fn - Async function
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
const debounceAsync = (fn, wait) => {
  let timeout;
  
  return (...args) => {
    clearTimeout(timeout);
    
    return new Promise((resolve, reject) => {
      timeout = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
};

/**
 * Creates a throttled async function
 * @param {Function} fn - Async function
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
const throttleAsync = (fn, limit) => {
  let inThrottle;
  let lastResult;
  
  return (...args) => {
    if (!inThrottle) {
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
      
      return fn(...args);
    }
    
    return lastResult;
  };
};

/**
 * Measures execution time of async function
 * @param {Function} fn - Async function
 * @param {string} label - Label for logging
 * @returns {Function} Wrapped function
 */
const measureTime = (fn, label = 'Function') => {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      console.log(`⏱️ ${label} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`⏱️ ${label} failed after ${duration}ms`);
      throw error;
    }
  };
};

/**
 * Logs errors and continues (doesn't throw)
 * @param {Function} fn - Async function
 * @param {string} errorMessage - Custom error message
 * @returns {Function} Wrapped function
 */
const logAndContinue = (fn, errorMessage = 'Error occurred') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error);
      return null;
    }
  };
};

// ==================== EXPORTS ====================
module.exports = {
  catchAsync,
  catchAsyncWithOptions,
  wrapController,
  wrapService,
  safeAsync,
  retryAsync,
  timeoutAsync,
  debounceAsync,
  throttleAsync,
  measureTime,
  logAndContinue
};