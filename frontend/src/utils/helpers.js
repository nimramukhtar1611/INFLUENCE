// utils/helpers.js - COMPLETE FIXED VERSION
import { format, formatDistance, formatDistanceToNow, formatRelative, isToday, isYesterday, isThisWeek } from 'date-fns';

// ==================== DATE FORMATTING ====================

/**
 * Format date to specified format
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'MM/dd/yyyy')
 * @returns {string}
 */
export const formatDate = (date, formatStr = 'MM/dd/yyyy') => {
  if (!date) return '';
  try {
    return format(new Date(date), formatStr);
  } catch {
    return '';
  }
};

/**
 * Format time (HH:MM AM/PM)
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const formatTime = (date) => {
  if (!date) return '';
  try {
    return format(new Date(date), 'hh:mm a');
  } catch {
    return '';
  }
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string}
 */
export const timeAgo = (date) => {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
};

/**
 * Get smart date display (Today, Yesterday, or actual date)
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const smartDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    if (isThisWeek(d)) return format(d, 'EEEE');
    return format(d, 'MMM d, yyyy');
  } catch {
    return '';
  }
};

/**
 * Format date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string}
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  } catch {
    return '';
  }
};

// ==================== NUMBER FORMATTING ====================

/**
 * Format number with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string}
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Format currency with abbreviations for large amounts
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, GBP, etc.)
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0';
  
  // Handle very large amounts with abbreviations
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string}
 */
export const truncate = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string}
 */
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Capitalize each word
 * @param {string} text - Text to capitalize
 * @returns {string}
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @returns {string}
 */
export const slugify = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ==================== ARRAY HELPERS ====================

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object}
 */
export const groupBy = (array, key) => {
  if (!array) return {};
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentValue);
    return result;
  }, {});
};

/**
 * Sort array by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array}
 */
export const sortBy = (array, key, order = 'asc') => {
  if (!array) return [];
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

/**
 * Get unique values by key
 * @param {Array} array - Array to process
 * @param {string} key - Key to check uniqueness
 * @returns {Array}
 */
export const uniqueBy = (array, key) => {
  if (!array) return [];
  return [...new Map(array.map(item => [item[key], item])).values()];
};

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object}
 */
export const paginate = (array, page = 1, limit = 10) => {
  if (!array) return { data: [], total: 0, page, limit, pages: 0 };
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    total: array.length,
    page,
    limit,
    pages: Math.ceil(array.length / limit)
  };
};

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array}
 */
export const chunk = (array, size) => {
  if (!array) return [];
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

// ==================== OBJECT HELPERS ====================

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export const deepClone = (obj) => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object}
 */
export const pick = (obj, keys) => {
  if (!obj) return {};
  return keys.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object}
 */
export const omit = (obj, keys) => {
  if (!obj) return {};
  return Object.keys(obj)
    .filter(key => !keys.includes(key))
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
export const isEmpty = (obj) => {
  return !obj || Object.keys(obj).length === 0;
};

/**
 * Merge objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object}
 */
export const deepMerge = (...objects) => {
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (!acc[key]) acc[key] = {};
        acc[key] = deepMerge(acc[key], obj[key]);
      } else {
        acc[key] = obj[key];
      }
    });
    return acc;
  }, {});
};

// ==================== STRING HELPERS ====================

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string}
 */
export const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate random ID
 * @returns {string}
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Extract mentions from text
 * @param {string} text - Text to extract from
 * @returns {Array}
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.substring(1)) : [];
};

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract from
 * @returns {Array}
 */
export const extractHashtags = (text) => {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.substring(1)) : [];
};

/**
 * Mask email (j***@example.com)
 * @param {string} email - Email to mask
 * @returns {string}
 */
export const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedUsername = username.substring(0, 3) + '***' + username.slice(-2);
  return `${maskedUsername}@${domain}`;
};

/**
 * Mask phone number
 * @param {string} phone - Phone to mask
 * @returns {string}
 */
export const maskPhone = (phone) => {
  if (!phone) return '';
  const last4 = phone.slice(-4);
  return '***-***-' + last4;
};

// ==================== MATH HELPERS ====================

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number}
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculate average
 * @param {Array} numbers - Array of numbers
 * @returns {number}
 */
export const calculateAverage = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + (num || 0), 0);
  return sum / numbers.length;
};

/**
 * Calculate engagement rate
 * @param {number} likes - Likes count
 * @param {number} comments - Comments count
 * @param {number} shares - Shares count
 * @param {number} followers - Followers count
 * @returns {number}
 */
export const calculateEngagementRate = (likes, comments, shares, followers) => {
  if (!followers || followers === 0) return 0;
  const total = (likes || 0) + (comments || 0) + (shares || 0);
  return (total / followers) * 100;
};

/**
 * Calculate ROI
 * @param {number} revenue - Revenue
 * @param {number} cost - Cost
 * @returns {number}
 */
export const calculateROI = (revenue, cost) => {
  if (!cost || cost === 0) return 0;
  return (revenue - cost) / cost;
};

/**
 * Calculate growth percentage
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number}
 */
export const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// ==================== COLOR HELPERS ====================

/**
 * Get random color
 * @returns {string}
 */
export const getRandomColor = () => {
  const colors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#06B6D4', '#D946EF', '#F43F5E', '#64748B', '#0EA5E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get color for platform
 * @param {string} platform - Platform name
 * @returns {string}
 */
export const getPlatformColor = (platform) => {
  const colors = {
    instagram: '#E1306C',
    youtube: '#FF0000',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    facebook: '#4267B2',
    linkedin: '#0077B5',
    pinterest: '#E60023',
    snapchat: '#FFFC00',
    twitch: '#9146FF',
    discord: '#5865F2'
  };
  return colors[platform?.toLowerCase()] || '#4F46E5';
};

/**
 * Get color for status
 * @param {string} status - Status
 * @returns {Object}
 */
export const getStatusColor = (status) => {
  const colors = {
    active: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
    paused: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
    disputed: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' }
  };
  return colors[status?.toLowerCase()] || colors.pending;
};

// ==================== EXPORT ====================
export default {
  formatDate,
  formatTime,
  timeAgo,
  smartDate,
  formatDateRange,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  truncate,
  capitalize,
  capitalizeWords,
  slugify,
  groupBy,
  sortBy,
  uniqueBy,
  paginate,
  chunk,
  deepClone,
  pick,
  omit,
  isEmpty,
  deepMerge,
  generateRandomString,
  generateId,
  extractMentions,
  extractHashtags,
  maskEmail,
  maskPhone,
  calculatePercentage,
  calculateAverage,
  calculateEngagementRate,
  calculateROI,
  calculateGrowth,
  getRandomColor,
  getPlatformColor,
  getStatusColor
};