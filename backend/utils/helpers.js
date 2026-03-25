// utils/helpers.js - COMPLETE FIXED VERSION WITH ALL HELPERS
const crypto = require('crypto');

// ==================== DATE FORMATTING ====================

/**
 * Format date to specified format
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'MM/DD/YYYY')
 * @returns {string} Formatted date
 */
const formatDate = (date, format = 'MM/DD/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  const formats = {
    'MM/DD/YYYY': `${month}/${day}/${year}`,
    'DD/MM/YYYY': `${day}/${month}/${year}`,
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'MM-DD-YYYY': `${month}-${day}-${year}`,
    'DD-MM-YYYY': `${day}-${month}-${year}`,
    'MM/DD/YY': `${month}/${day}/${year.toString().slice(2)}`,
    'DD/MM/YY': `${day}/${month}/${year.toString().slice(2)}`,
    'YYYY/MM/DD': `${year}/${month}/${day}`,
    'HH:MM': `${hours}:${minutes}`,
    'HH:MM:SS': `${hours}:${minutes}:${seconds}`,
    'MM/DD/YYYY HH:MM': `${month}/${day}/${year} ${hours}:${minutes}`,
    'full': d.toLocaleString(),
    'date': d.toLocaleDateString(),
    'time': d.toLocaleTimeString()
  };
  
  return formats[format] || formats['MM/DD/YYYY'];
};

/**
 * Format time ago (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string} Time ago string
 */
const timeAgo = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const seconds = Math.floor((new Date() - d) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  
  return 'just now';
};

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {boolean}
 */
const isDateInRange = (date, start, end) => {
  const d = new Date(date);
  return d >= new Date(start) && d <= new Date(end);
};

/**
 * Add days to date
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date}
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get start of day
 * @param {Date} date - Date
 * @returns {Date}
 */
const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get end of day
 * @param {Date} date - Date
 * @returns {Date}
 */
const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Get start of month
 * @param {Date} date - Date
 * @returns {Date}
 */
const startOfMonth = (date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get end of month
 * @param {Date} date - Date
 * @returns {Date}
 */
const endOfMonth = (date) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Get difference in days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number}
 */
const daysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==================== NUMBER FORMATTING ====================

/**
 * Format number with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string}
 */
const formatNumber = (num) => {
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
 * Format currency
 * @param {number} amount - Amount
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string}
 */
const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0';
  
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
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number}
 */
const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculate engagement rate
 * @param {number} likes - Likes count
 * @param {number} comments - Comments count
 * @param {number} shares - Shares count
 * @param {number} followers - Followers count
 * @returns {number}
 */
const calculateEngagementRate = (likes, comments, shares, followers) => {
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
const calculateROI = (revenue, cost) => {
  if (!cost || cost === 0) return 0;
  return ((revenue - cost) / cost) * 100;
};

/**
 * Calculate average
 * @param {number[]} numbers - Array of numbers
 * @returns {number}
 */
const calculateAverage = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + (num || 0), 0);
  return sum / numbers.length;
};

/**
 * Calculate median
 * @param {number[]} numbers - Array of numbers
 * @returns {number}
 */
const calculateMedian = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Calculate standard deviation
 * @param {number[]} numbers - Array of numbers
 * @returns {number}
 */
const calculateStdDev = (numbers) => {
  if (!numbers || numbers.length === 0) return 0;
  const avg = calculateAverage(numbers);
  const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

// ==================== STRING UTILITIES ====================

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string}
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate OTP
 * @param {number} length - OTP length
 * @returns {string}
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @returns {string}
 */
const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string}
 */
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize each word
 * @param {string} str - String to capitalize
 * @returns {string}
 */
const capitalizeWords = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Generate slug from string
 * @param {string} str - String to slugify
 * @returns {string}
 */
const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Extract mentions from text
 * @param {string} text - Text to extract from
 * @returns {string[]}
 */
const extractMentions = (text) => {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.substring(1)) : [];
};

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract from
 * @returns {string[]}
 */
const extractHashtags = (text) => {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.substring(1)) : [];
};

/**
 * Mask email (e.g., j***@example.com)
 * @param {string} email - Email to mask
 * @returns {string}
 */
const maskEmail = (email) => {
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
const maskPhone = (phone) => {
  if (!phone) return '';
  const last4 = phone.slice(-4);
  return '***-***-' + last4;
};

/**
 * Generate referral code
 * @param {string} userId - User ID
 * @returns {string}
 */
const generateReferralCode = (userId) => {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const userIdPart = userId.toString().slice(-4).toUpperCase();
  return `REF-${userIdPart}-${random}`;
};

/**
 * Parse template string with variables
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object with variable values
 * @returns {string}
 */
const parseTemplate = (template, data) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
};

// ==================== ARRAY UTILITIES ====================

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object}
 */
const groupBy = (array, key) => {
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
const sortBy = (array, key, order = 'asc') => {
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
const uniqueBy = (array, key) => {
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
const paginate = (array, page = 1, limit = 10) => {
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
 * @returns {Array[]}
 */
const chunkArray = (array, size) => {
  if (!array) return [];
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Shuffle array
 * @param {Array} array - Array to shuffle
 * @returns {Array}
 */
const shuffleArray = (array) => {
  if (!array) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ==================== OBJECT UTILITIES ====================

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
const deepClone = (obj) => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {string[]} keys - Keys to pick
 * @returns {Object}
 */
const pick = (obj, keys) => {
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
 * @param {string[]} keys - Keys to omit
 * @returns {Object}
 */
const omit = (obj, keys) => {
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
const isEmpty = (obj) => {
  return !obj || Object.keys(obj).length === 0;
};

/**
 * Merge objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object}
 */
const deepMerge = (...objects) => {
  const result = {};
  
  objects.forEach(obj => {
    if (!obj) return;
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    });
  });
  
  return result;
};

/**
 * Flatten nested object
 * @param {Object} obj - Nested object
 * @param {string} prefix - Key prefix
 * @returns {Object}
 */
const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], pre + key));
    } else {
      acc[pre + key] = obj[key];
    }
    return acc;
  }, {});
};

// ==================== FILE UTILITIES ====================

/**
 * Get file extension
 * @param {string} filename - File name
 * @returns {string}
 */
const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Get file name without extension
 * @param {string} filename - File name
 * @returns {string}
 */
const getFileName = (filename) => {
  if (!filename) return '';
  return filename.replace(/\.[^/.]+$/, '');
};

/**
 * Convert bytes to human readable size
 * @param {number} bytes - Bytes
 * @returns {string}
 */
const bytesToSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

/**
 * Get MIME type from extension
 * @param {string} extension - File extension
 * @returns {string}
 */
const getMimeType = (extension) => {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

// ==================== COLOR UTILITIES ====================

/**
 * Generate random color
 * @returns {string}
 */
const randomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Get color for platform
 * @param {string} platform - Platform name
 * @returns {string}
 */
const getPlatformColor = (platform) => {
  const colors = {
    instagram: '#E1306C',
    youtube: '#FF0000',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    facebook: '#4267B2',
    linkedin: '#0077B5',
    website: '#4F46E5',
    other: '#6B7280'
  };
  return colors[platform.toLowerCase()] || colors.other;
};

/**
 * Hex to RGB
 * @param {string} hex - Hex color
 * @returns {Object}
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * RGB to Hex
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string}
 */
const rgbToHex = (r, g, b) => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// ==================== VALIDATION HELPERS ====================

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone
 * @param {string} phone - Phone to validate
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  const re = /^[0-9a-fA-F]{24}$/;
  return re.test(id);
};

// ==================== EXPORTS ====================
module.exports = {
  // Date utilities
  formatDate,
  timeAgo,
  isDateInRange,
  addDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  daysDiff,
  
  // Number utilities
  formatNumber,
  formatCurrency,
  formatPercentage,
  calculatePercentage,
  calculateEngagementRate,
  calculateROI,
  calculateAverage,
  calculateMedian,
  calculateStdDev,
  
  // String utilities
  generateRandomString,
  generateOTP,
  truncate,
  capitalize,
  capitalizeWords,
  slugify,
  extractMentions,
  extractHashtags,
  maskEmail,
  maskPhone,
  generateReferralCode,
  parseTemplate,
  
  // Array utilities
  groupBy,
  sortBy,
  uniqueBy,
  paginate,
  chunkArray,
  shuffleArray,
  
  // Object utilities
  deepClone,
  pick,
  omit,
  isEmpty,
  deepMerge,
  flattenObject,
  
  // File utilities
  getFileExtension,
  getFileName,
  bytesToSize,
  getMimeType,
  
  // Color utilities
  randomColor,
  getPlatformColor,
  hexToRgb,
  rgbToHex,
  
  // Validation helpers
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidObjectId
};