// utils/errorHandler.js - COMPLETE FIXED VERSION
import toast from 'react-hot-toast';

// ==================== ERROR TYPES ====================
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// ==================== ERROR MESSAGES ====================
const DEFAULT_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network error. Please check your connection.',
  [ERROR_TYPES.AUTH]: 'Authentication failed. Please login again.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.SERVER]: 'Server error. Please try again later.',
  [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_TYPES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please try again later.',
  [ERROR_TYPES.TIMEOUT]: 'Request timeout. Please try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred.'
};

// ==================== ERROR ICONS ====================
const ERROR_ICONS = {
  [ERROR_TYPES.NETWORK]: '🌐',
  [ERROR_TYPES.AUTH]: '🔒',
  [ERROR_TYPES.VALIDATION]: '⚠️',
  [ERROR_TYPES.SERVER]: '🔥',
  [ERROR_TYPES.NOT_FOUND]: '🔍',
  [ERROR_TYPES.FORBIDDEN]: '🚫',
  [ERROR_TYPES.RATE_LIMIT]: '⏳',
  [ERROR_TYPES.TIMEOUT]: '⏰',
  [ERROR_TYPES.UNKNOWN]: '❌'
};

// ==================== ERROR COLORS ====================
const ERROR_COLORS = {
  [ERROR_TYPES.NETWORK]: 'orange',
  [ERROR_TYPES.AUTH]: 'red',
  [ERROR_TYPES.VALIDATION]: 'yellow',
  [ERROR_TYPES.SERVER]: 'red',
  [ERROR_TYPES.NOT_FOUND]: 'gray',
  [ERROR_TYPES.FORBIDDEN]: 'red',
  [ERROR_TYPES.RATE_LIMIT]: 'orange',
  [ERROR_TYPES.TIMEOUT]: 'orange',
  [ERROR_TYPES.UNKNOWN]: 'red'
};

// ==================== PARSE ERROR ====================
export const parseError = (error) => {
  // Axios error
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      return {
        type: ERROR_TYPES.AUTH,
        message: data.message || 'Session expired. Please login again.',
        status
      };
    }

    if (status === 403) {
      return {
        type: ERROR_TYPES.FORBIDDEN,
        message: data.message || 'You do not have permission.',
        status
      };
    }

    if (status === 404) {
      return {
        type: ERROR_TYPES.NOT_FOUND,
        message: data.message || 'Resource not found.',
        status
      };
    }

    if (status === 422 || status === 400) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: data.message || 'Validation failed.',
        errors: data.errors,
        status
      };
    }

    if (status === 429) {
      return {
        type: ERROR_TYPES.RATE_LIMIT,
        message: data.message || 'Too many requests.',
        retryAfter: data.retryAfter,
        status
      };
    }

    if (status >= 500) {
      return {
        type: ERROR_TYPES.SERVER,
        message: data.message || 'Server error occurred.',
        status
      };
    }
  }

  // Network error
  if (error.code === 'ECONNABORTED') {
    return {
      type: ERROR_TYPES.TIMEOUT,
      message: 'Request timed out. Please try again.'
    };
  }

  if (error.message === 'Network Error' || !navigator.onLine) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: 'Unable to connect to server. Please check your internet connection.'
    };
  }

  // Default
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error.message || DEFAULT_MESSAGES[ERROR_TYPES.UNKNOWN]
  };
};

// ==================== SHOW ERROR TOAST ====================
export const showErrorToast = (error, options = {}) => {
  const parsed = parseError(error);
  
  toast.error(parsed.message, {
    icon: ERROR_ICONS[parsed.type],
    duration: options.duration || 4000,
    position: options.position || 'top-right',
    className: `toast-error toast-${ERROR_COLORS[parsed.type]}`,
    ...options
  });

  return parsed;
};

// ==================== SHOW SUCCESS TOAST ====================
export const showSuccessToast = (message, options = {}) => {
  toast.success(message, {
    icon: '✅',
    duration: options.duration || 3000,
    position: options.position || 'top-right',
    ...options
  });
};

// ==================== SHOW INFO TOAST ====================
export const showInfoToast = (message, options = {}) => {
  toast(message, {
    icon: 'ℹ️',
    duration: options.duration || 3000,
    position: options.position || 'top-right',
    ...options
  });
};

// ==================== SHOW WARNING TOAST ====================
export const showWarningToast = (message, options = {}) => {
  toast(message, {
    icon: '⚠️',
    duration: options.duration || 4000,
    position: options.position || 'top-right',
    className: 'toast-warning',
    ...options
  });
};

// ==================== SHOW LOADING TOAST ====================
export const showLoadingToast = (message, options = {}) => {
  return toast.loading(message, {
    position: options.position || 'top-right',
    ...options
  });
};

// ==================== DISMISS TOAST ====================
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// ==================== HANDLE API ERROR ====================
export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  console.error('API Error:', error);

  // Show toast
  showErrorToast(error);

  // Return parsed error for component use
  return parseError(error);
};

// ==================== HANDLE FORM ERRORS ====================
export const handleFormErrors = (errors, setFieldError) => {
  if (!errors || !setFieldError) return;

  if (Array.isArray(errors)) {
    errors.forEach(error => {
      if (error.field) {
        setFieldError(error.field, error.message);
      }
    });
  } else if (typeof errors === 'object') {
    Object.entries(errors).forEach(([field, message]) => {
      setFieldError(field, message);
    });
  }

  showErrorToast({
    message: 'Please fix the errors in the form',
    type: ERROR_TYPES.VALIDATION
  });
};

// ==================== HANDLE SUCCESS ====================
export const handleSuccess = (message, callback) => {
  showSuccessToast(message);
  if (callback) callback();
};

// ==================== HANDLE CONFIRMATION ====================
export const confirmAction = (message, onConfirm, onCancel) => {
  if (window.confirm(message)) {
    onConfirm();
  } else {
    if (onCancel) onCancel();
  }
};

// ==================== CREATE ERROR HANDLER ====================
export const createErrorHandler = (context) => {
  return (error) => {
    console.error(`Error in ${context}:`, error);
    return handleApiError(error);
  };
};

// ==================== WRAP ASYNC FUNCTION ====================
export const withErrorHandling = (fn, errorMessage = 'Operation failed') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      showErrorToast(error);
      throw error;
    }
  };
};

// ==================== RETRY FUNCTION ====================
export const retryOperation = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};

// ==================== EXPORT ====================
export default {
  ERROR_TYPES,
  parseError,
  showErrorToast,
  showSuccessToast,
  showInfoToast,
  showWarningToast,
  showLoadingToast,
  dismissToast,
  handleApiError,
  handleFormErrors,
  handleSuccess,
  confirmAction,
  createErrorHandler,
  withErrorHandling,
  retryOperation
};