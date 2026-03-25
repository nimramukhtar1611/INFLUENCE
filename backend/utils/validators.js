// utils/validators.js - COMPLETE FIXED VERSION

// ==================== EMAIL VALIDATION ====================
const isValidEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// ==================== PHONE VALIDATION ====================
const isValidPhone = (phone) => {
  if (!phone) return false;
  // International format: +1234567890 or 1234567890
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone.replace(/[\s-]/g, ''));
};

// ==================== PASSWORD VALIDATION ====================
const isValidPassword = (password) => {
  if (!password) return false;
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return re.test(password);
};

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, feedback: [] };
  
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');
  
  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add at least one uppercase letter');
  
  // Lowercase check
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add at least one lowercase letter');
  
  // Number check
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add at least one number');
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Add at least one special character');
  
  // Common patterns check
  const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common patterns');
  }
  
  // Sequential characters check
  const sequences = ['123', '234', '345', '456', '567', '678', '789', 
                     'abc', 'bcd', 'cde', 'def', 'qwe', 'wer', 'ert'];
  if (sequences.some(seq => password.toLowerCase().includes(seq))) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid sequential characters');
  }
  
  return {
    score,
    maxScore: 5,
    percentage: (score / 5) * 100,
    strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
    feedback
  };
};

// ==================== URL VALIDATION ====================
const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==================== SOCIAL MEDIA HANDLE VALIDATION ====================
const isValidInstagramHandle = (handle) => {
  if (!handle) return false;
  const cleanHandle = handle.replace('@', '');
  const re = /^[a-zA-Z0-9._]{1,30}$/;
  return re.test(cleanHandle);
};

const isValidYouTubeHandle = (handle) => {
  if (!handle) return false;
  const cleanHandle = handle.replace('@', '');
  // YouTube handles can have letters, numbers, and some special chars
  return cleanHandle.length >= 3 && cleanHandle.length <= 50;
};

const isValidTikTokHandle = (handle) => {
  if (!handle) return false;
  const cleanHandle = handle.replace('@', '');
  const re = /^[a-zA-Z0-9._]{1,24}$/;
  return re.test(cleanHandle);
};

const isValidTwitterHandle = (handle) => {
  if (!handle) return false;
  const cleanHandle = handle.replace('@', '');
  const re = /^[a-zA-Z0-9_]{1,15}$/;
  return re.test(cleanHandle);
};

// ==================== NUMBER VALIDATION ====================
const isValidFollowerCount = (count) => {
  const num = parseInt(count);
  return !isNaN(num) && num >= 0 && num <= 1000000000;
};

const isValidEngagementRate = (rate) => {
  const num = parseFloat(rate);
  return !isNaN(num) && num >= 0 && num <= 100;
};

const isValidBudget = (budget) => {
  const num = parseFloat(budget);
  return !isNaN(num) && num >= 10 && num <= 1000000;
};

const isValidPercentage = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};

const isValidAge = (age) => {
  const num = parseInt(age);
  return !isNaN(num) && num >= 13 && num <= 120;
};

// ==================== DATE VALIDATION ====================
const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

const isValidFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) > new Date();
};

const isValidPastDate = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) < new Date();
};

const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  return new Date(startDate) <= new Date(endDate);
};

// ==================== ID VALIDATION ====================
const isValidObjectId = (id) => {
  if (!id) return false;
  const re = /^[0-9a-fA-F]{24}$/;
  return re.test(id);
};

const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(uuid);
};

// ==================== FILE VALIDATION ====================
const isValidFileSize = (size, maxSize = 100 * 1024 * 1024) => {
  return size <= maxSize;
};

const isValidFileType = (mimetype, allowedTypes = []) => {
  if (!mimetype) return false;
  if (allowedTypes.length === 0) return true;
  return allowedTypes.includes(mimetype);
};

const isValidImageFile = (mimetype) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(mimetype);
};

const isValidVideoFile = (mimetype) => {
  const videoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
  return videoTypes.includes(mimetype);
};

const isValidDocumentFile = (mimetype) => {
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return docTypes.includes(mimetype);
};

// ==================== PAGINATION VALIDATION ====================
const isValidPagination = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  return pageNum > 0 && limitNum > 0 && limitNum <= 100;
};

const normalizePagination = (page, limit, defaultLimit = 10, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit) || defaultLimit));
  return { page: pageNum, limit: limitNum };
};

// ==================== JSON VALIDATION ====================
const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// ==================== ENUM VALIDATION ====================
const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

// ==================== RANGE VALIDATION ====================
const isInRange = (value, min, max) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// ==================== REQUIRED FIELD VALIDATION ====================
const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

// ==================== COMPLEX VALIDATIONS ====================
const validateCampaign = (campaign) => {
  const errors = [];
  
  if (!isRequired(campaign.title)) {
    errors.push('Campaign title is required');
  } else if (campaign.title.length < 5 || campaign.title.length > 100) {
    errors.push('Campaign title must be between 5 and 100 characters');
  }
  
  if (!isRequired(campaign.description)) {
    errors.push('Campaign description is required');
  } else if (campaign.description.length < 20 || campaign.description.length > 2000) {
    errors.push('Campaign description must be between 20 and 2000 characters');
  }
  
  if (campaign.budget && !isValidBudget(campaign.budget)) {
    errors.push('Invalid budget amount (must be between $10 and $1,000,000)');
  }
  
  if (campaign.startDate && campaign.endDate) {
    if (!isValidDateRange(campaign.startDate, campaign.endDate)) {
      errors.push('End date must be after start date');
    }
  }
  
  if (campaign.deliverables && campaign.deliverables.length === 0) {
    errors.push('At least one deliverable is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDeal = (deal) => {
  const errors = [];
  
  if (!isValidObjectId(deal.campaignId)) {
    errors.push('Invalid campaign ID');
  }
  
  if (!isValidObjectId(deal.creatorId)) {
    errors.push('Invalid creator ID');
  }
  
  if (!isValidBudget(deal.budget)) {
    errors.push('Invalid budget amount');
  }
  
  if (deal.deadline && !isValidFutureDate(deal.deadline)) {
    errors.push('Deadline must be in the future');
  }
  
  if (deal.deliverables && deal.deliverables.length === 0) {
    errors.push('At least one deliverable is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUser = (user) => {
  const errors = [];
  
  if (!isValidEmail(user.email)) {
    errors.push('Invalid email address');
  }
  
  if (user.password && !isValidPassword(user.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  if (user.phone && !isValidPhone(user.phone)) {
    errors.push('Invalid phone number');
  }
  
  if (!isRequired(user.fullName)) {
    errors.push('Full name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validatePaymentMethod = (method) => {
  const errors = [];
  
  if (!isRequired(method.type)) {
    errors.push('Payment method type is required');
  }
  
  if (method.type === 'credit_card') {
    if (!method.cardNumber || !/^\d{16}$/.test(method.cardNumber)) {
      errors.push('Invalid card number');
    }
    if (!method.expiryMonth || method.expiryMonth < 1 || method.expiryMonth > 12) {
      errors.push('Invalid expiry month');
    }
    if (!method.expiryYear || method.expiryYear < new Date().getFullYear()) {
      errors.push('Invalid expiry year');
    }
    if (!method.cvv || !/^\d{3,4}$/.test(method.cvv)) {
      errors.push('Invalid CVV');
    }
  }
  
  if (method.type === 'bank_account') {
    if (!isRequired(method.bankName)) {
      errors.push('Bank name is required');
    }
    if (!method.accountNumber || !/^\d{8,17}$/.test(method.accountNumber)) {
      errors.push('Invalid account number');
    }
    if (!method.routingNumber || !/^\d{9}$/.test(method.routingNumber)) {
      errors.push('Invalid routing number');
    }
  }
  
  if (method.type === 'paypal') {
    if (!isValidEmail(method.paypalEmail)) {
      errors.push('Invalid PayPal email');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ==================== EXPORTS ====================
module.exports = {
  // Basic validators
  isValidEmail,
  isValidPhone,
  isValidPassword,
  getPasswordStrength,
  isValidUrl,
  
  // Social media validators
  isValidInstagramHandle,
  isValidYouTubeHandle,
  isValidTikTokHandle,
  isValidTwitterHandle,
  
  // Number validators
  isValidFollowerCount,
  isValidEngagementRate,
  isValidBudget,
  isValidPercentage,
  isValidAge,
  isInRange,
  
  // Date validators
  isValidDate,
  isValidFutureDate,
  isValidPastDate,
  isValidDateRange,
  
  // ID validators
  isValidObjectId,
  isValidUUID,
  
  // File validators
  isValidFileSize,
  isValidFileType,
  isValidImageFile,
  isValidVideoFile,
  isValidDocumentFile,
  
  // Pagination validators
  isValidPagination,
  normalizePagination,
  
  // Other validators
  isValidJSON,
  isValidEnum,
  isRequired,
  
  // Complex validators
  validateCampaign,
  validateDeal,
  validateUser,
  validatePaymentMethod
};