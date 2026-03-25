// services/api.js - COMPLETE PRODUCTION-READY VERSION
import axios from 'axios';

// ==================== CONFIGURATION ====================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // Send cookies if any
});

// ==================== TOKEN MANAGEMENT ====================
const getToken = () => localStorage.getItem('token');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (token, refreshToken) => {
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};
const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add refresh token header if it's a refresh request
    if (config.url?.includes('/auth/refresh') && getRefreshToken()) {
      config.headers['x-refresh-token'] = getRefreshToken();
    }

    // Add timestamp to GET requests to avoid cache
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // Add request ID for tracing
    config.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== RESPONSE INTERCEPTOR ====================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        success: false,
        error: 'Request timeout. Please try again.',
        code: 'TIMEOUT',
      });
    }

    if (!error.response) {
      return Promise.reject({
        success: false,
        error: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized
    if (status === 401 && !originalRequest._retry) {
      // Don't retry on login or register endpoints
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/admin/login');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Check if refresh token exists
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        // Redirect to login after clearing
        window.location.href = '/login';
        return Promise.reject({
          success: false,
          error: 'Session expired. Please login again.',
          code: 'NO_REFRESH_TOKEN',
        });
      }

      originalRequest._retry = true;

      // If already refreshing, queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.data?.success && response.data?.token) {
          const { token, refreshToken: newRefreshToken } = response.data;

          setTokens(token, newRefreshToken);

          // Update default auth header
          api.defaults.headers.common.Authorization = `Bearer ${token}`;

          // Process queued requests
          processQueue(null, token);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject({
          success: false,
          error: 'Session expired. Please login again.',
          code: 'REFRESH_FAILED',
        });
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (status === 403) {
      return Promise.reject({
        success: false,
        error: data?.error || 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }

    // Handle 404 Not Found
    if (status === 404) {
      return Promise.reject({
        success: false,
        error: data?.error || 'Resource not found.',
        code: 'NOT_FOUND',
      });
    }

    // Handle 429 Rate Limit
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      return Promise.reject({
        success: false,
        error: `Too many requests. Please try again after ${retryAfter} seconds.`,
        code: 'RATE_LIMIT',
        retryAfter,
      });
    }

    // Handle 500+ Server Errors
    if (status >= 500) {
      return Promise.reject({
        success: false,
        error: 'Internal server error. Please try again later.',
        code: 'SERVER_ERROR',
      });
    }

    // Handle 400 Validation Errors
    if (status === 400 && data?.errors) {
      return Promise.reject({
        success: false,
        errors: data.errors,
        code: 'VALIDATION_ERROR',
      });
    }

    // Default error response
    return Promise.reject({
      success: false,
      error: data?.message || data?.error || error.message,
      code: data?.code || 'UNKNOWN_ERROR',
      status,
      data,
    });
  }
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user is authenticated
 */
api.isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
};

/**
 * Get current user from localStorage
 */
api.getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Upload a file with progress callback
 * @param {string} url - Upload endpoint
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (percent)
 * @param {Object} config - Additional axios config
 */
api.upload = (url, file, onProgress, config = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(url, formData, {
    ...config,
    headers: {
      ...config.headers,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

/**
 * Download a file
 * @param {string} url - Download endpoint
 * @param {string} filename - Suggested filename
 * @param {Object} config - Additional axios config
 */
api.download = async (url, filename, config = {}) => {
  const response = await api.get(url, {
    ...config,
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename || 'download');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return { success: true };
};

/**
 * Clear all auth data and redirect to login
 */
api.logout = () => {
  clearTokens();
  // Optional: call logout endpoint
  // api.post('/auth/logout').catch(() => {});
  window.location.href = '/login';
};

// ==================== EXPORTS ====================
export default api;