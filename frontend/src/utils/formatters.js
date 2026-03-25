// utils/formatters.js - COMPLETE FIXED VERSION
import { format, formatDistance, formatDistanceToNow, formatRelative, formatDuration, intervalToDuration } from 'date-fns';

// ==================== CURRENCY FORMATTERS ====================

/**
 * Format currency with symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, GBP, etc.)
 * @param {string} locale - Locale (default: 'en-US')
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format currency without cents if whole number
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string}
 */
export const formatCurrencySmart = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '';
  
  const options = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  };
  
  return new Intl.NumberFormat('en-US', options).format(amount);
};

/**
 * Format currency compact (K, M, B)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string}
 */
export const formatCurrencyCompact = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '';
  
  const symbol = getCurrencySymbol(currency);
  
  if (amount >= 1000000000) {
    return symbol + (amount / 1000000000).toFixed(1) + 'B';
  }
  if (amount >= 1000000) {
    return symbol + (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return symbol + (amount / 1000).toFixed(1) + 'K';
  }
  return symbol + amount;
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string}
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    SGD: 'S$'
  };
  return symbols[currency] || '$';
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string}
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';
  return value.toFixed(decimals) + '%';
};

// ==================== DATE FORMATTERS ====================

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string
 * @returns {string}
 */
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return '';
  try {
    return format(new Date(date), formatStr);
  } catch {
    return '';
  }
};

/**
 * Format date with time
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
};

/**
 * Format time
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const formatTime = (date) => {
  if (!date) return '';
  try {
    return format(new Date(date), 'h:mm a');
  } catch {
    return '';
  }
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
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
    
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    
    if (sameMonth) {
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
    } else if (sameYear) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else {
      return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
    }
  } catch {
    return '';
  }
};

/**
 * Get smart date display
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const smartDate = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(d, 'MMM d, yyyy');
    }
  } catch {
    return '';
  }
};

/**
 * Format duration in days
 * @param {number} days - Number of days
 * @returns {string}
 */
export const formatDuration = (days) => {
  if (!days) return '0 days';
  
  const duration = intervalToDuration({ start: 0, end: days * 24 * 60 * 60 * 1000 });
  const parts = [];
  
  if (duration.years) parts.push(`${duration.years} year${duration.years > 1 ? 's' : ''}`);
  if (duration.months) parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
  if (duration.days) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
  
  return parts.join(' ') || '0 days';
};

// ==================== FILE SIZE FORMATTERS ====================

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
 * Format file size with decimal places
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export const formatFileSizePrecise = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

// ==================== NUMBER FORMATTERS ====================

/**
 * Format number with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string}
 */
export const formatCompactNumber = (num) => {
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
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else {
    return phone;
  }
};

/**
 * Format credit card number
 * @param {string} cardNumber - Card number
 * @returns {string}
 */
export const formatCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  
  return groups ? groups.join(' ') : cardNumber;
};

/**
 * Mask credit card number
 * @param {string} cardNumber - Card number
 * @returns {string}
 */
export const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  const last4 = cleaned.slice(-4);
  
  return `**** **** **** ${last4}`;
};

// ==================== TEXT FORMATTERS ====================

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
export const titleCase = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Convert to slug
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

// ==================== EXPORT ====================
export default {
  formatCurrency,
  formatCurrencySmart,
  formatCurrencyCompact,
  getCurrencySymbol,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatTime,
  timeAgo,
  formatDateRange,
  smartDate,
  formatDuration,
  formatFileSize,
  formatFileSizePrecise,
  formatCompactNumber,
  formatPhone,
  formatCardNumber,
  maskCardNumber,
  truncate,
  capitalize,
  titleCase,
  slugify
};