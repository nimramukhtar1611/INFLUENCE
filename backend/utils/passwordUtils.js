// utils/passwordUtils.js - COMPLETE FIXED VERSION
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PasswordHistory = require('../models/PasswordHistory');

// ==================== PASSWORD HASHING ====================

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// ==================== PASSWORD VALIDATION ====================

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const errors = [];
  const requirements = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      score: 0,
      requirements: []
    };
  }

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
    requirements.push('minimum 8 characters');
  } else {
    requirements.push('✓ 8+ characters');
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    requirements.push('uppercase letter');
  } else {
    requirements.push('✓ uppercase');
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    requirements.push('lowercase letter');
  } else {
    requirements.push('✓ lowercase');
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
    requirements.push('number');
  } else {
    requirements.push('✓ number');
  }

  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
    requirements.push('special character');
  } else {
    requirements.push('✓ special character');
  }

  // Common patterns check
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'baseball', 'football',
    'abc123', 'passw0rd', 'master', 'hello', 'freedom'
  ];
  
  const lowerPassword = password.toLowerCase();
  if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
    errors.push('Password contains common patterns');
  }

  // Sequential characters check
  const sequences = [
    '123', '234', '345', '456', '567', '678', '789',
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi',
    'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio',
    'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
    'zxc', 'xcv', 'cvb', 'vbn', 'bnm'
  ];
  
  if (sequences.some(seq => lowerPassword.includes(seq))) {
    errors.push('Password contains sequential characters');
  }

  // Repeated characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password contains repeated characters');
  }

  // Calculate password strength score (0-100)
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
  if (password.length >= 16) score += 10;
  
  // Bonus for complexity
  const uniqueChars = new Set(password).size;
  if (uniqueChars > password.length * 0.7) score += 10;

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(100, score),
    strength: score >= 80 ? 'strong' : score >= 60 ? 'medium' : 'weak',
    requirements
  };
};

// ==================== PASSWORD HISTORY ====================

/**
 * Save password to history
 * @param {string} userId - User ID
 * @param {string} hashedPassword - Hashed password
 * @param {number} maxHistory - Max history entries to keep
 * @returns {Promise<Object>}
 */
const savePasswordHistory = async (userId, hashedPassword, maxHistory = 5) => {
  try {
    // Add to history
    await PasswordHistory.create({
      userId,
      password: hashedPassword,
      changedAt: new Date()
    });

    // Keep only last N entries
    const history = await PasswordHistory.find({ userId })
      .sort({ changedAt: -1 });

    if (history.length > maxHistory) {
      const toDelete = history.slice(maxHistory);
      await Promise.all(
        toDelete.map(h => PasswordHistory.deleteOne({ _id: h._id }))
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving password history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if password was used before
 * @param {string} userId - User ID
 * @param {string} newPassword - New password to check
 * @param {number} checkCount - Number of previous passwords to check
 * @returns {Promise<Object>}
 */
const checkPasswordHistory = async (userId, newPassword, checkCount = 5) => {
  try {
    // Get password history
    const history = await PasswordHistory.find({ userId })
      .sort({ changedAt: -1 })
      .limit(checkCount);

    for (const entry of history) {
      const isMatch = await comparePassword(newPassword, entry.password);
      if (isMatch) {
        return {
          used: true,
          lastUsed: entry.changedAt,
          message: `Password was used ${Math.round((Date.now() - entry.changedAt) / (1000 * 60 * 60 * 24))} days ago`
        };
      }
    }

    return { used: false };
  } catch (error) {
    console.error('Error checking password history:', error);
    return { used: false, error: error.message };
  }
};

/**
 * Get password age in days
 * @param {Date} lastChanged - Last password change date
 * @returns {number} Age in days
 */
const getPasswordAge = (lastChanged) => {
  if (!lastChanged) return Infinity;
  const days = Math.floor((Date.now() - new Date(lastChanged)) / (1000 * 60 * 60 * 24));
  return days;
};

/**
 * Check if password is expired
 * @param {Date} lastChanged - Last password change date
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {boolean}
 */
const isPasswordExpired = (lastChanged, maxAgeDays = 90) => {
  const age = getPasswordAge(lastChanged);
  return age > maxAgeDays;
};

// ==================== PASSWORD GENERATION ====================

/**
 * Generate random password
 * @param {Object} options - Password options
 * @returns {string}
 */
const generatePassword = (options = {}) => {
  const {
    length = 12,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options;

  let charset = '';
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Remove similar looking characters
  if (excludeSimilar) {
    charset = charset.replace(/[ilLI|oO0]/g, '');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Generate temporary password (simpler, for resets)
 * @returns {string}
 */
const generateTempPassword = () => {
  return crypto.randomBytes(4).toString('hex') + 
         crypto.randomInt(1000, 9999).toString();
};

// ==================== PASSWORD POLICIES ====================

/**
 * Get password policy
 * @returns {Object} Password policy
 */
const getPasswordPolicy = () => {
  return {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    maxHistory: 5,
    expiryDays: 90,
    preventCommon: true,
    preventSequential: true,
    preventRepeated: true
  };
};

/**
 * Format password requirements for display
 * @returns {Array} Formatted requirements
 */
const getPasswordRequirements = () => {
  return [
    'At least 8 characters long',
    'Contains uppercase letter (A-Z)',
    'Contains lowercase letter (a-z)',
    'Contains number (0-9)',
    'Contains special character (!@#$%^&*)',
    'Cannot be a commonly used password',
    'Cannot contain sequential characters',
    'Cannot contain repeated characters'
  ];
};

// ==================== SECURITY UTILITIES ====================

/**
 * Generate password reset token
 * @returns {string}
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash reset token for storage
 * @param {string} token - Reset token
 * @returns {string}
 */
const hashResetToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Check if password needs change
 * @param {Date} lastChanged - Last password change
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {Object}
 */
const checkPasswordHealth = (lastChanged, maxAgeDays = 90) => {
  const age = getPasswordAge(lastChanged);
  const expired = age > maxAgeDays;
  const warning = age > maxAgeDays * 0.8; // Warning at 80% of max age

  return {
    age,
    expired,
    warning,
    daysRemaining: Math.max(0, maxAgeDays - age),
    message: expired 
      ? 'Password expired. Please change your password.'
      : warning
        ? `Your password will expire in ${maxAgeDays - age} days`
        : 'Password is healthy'
  };
};

// ==================== EXPORTS ====================
module.exports = {
  // Core functions
  hashPassword,
  comparePassword,
  validatePassword,
  
  // Password history
  savePasswordHistory,
  checkPasswordHistory,
  getPasswordAge,
  isPasswordExpired,
  
  // Generation
  generatePassword,
  generateTempPassword,
  generateResetToken,
  hashResetToken,
  
  // Policies
  getPasswordPolicy,
  getPasswordRequirements,
  checkPasswordHealth
};