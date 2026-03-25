// utils/jwtUtils.js - COMPLETE FIXED VERSION
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const TokenBlacklist = require('../models/TokenBlacklist');

// ==================== TOKEN GENERATION ====================

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiry time (default: 15m)
 * @returns {string}
 */
const generateToken = (payload, expiresIn = '15m') => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @param {number} version - Token version (for invalidation)
 * @returns {string}
 */
const generateRefreshToken = (userId, version = 1) => {
  return jwt.sign(
    { 
      id: userId,
      version,
      random: crypto.randomBytes(8).toString('hex')
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Tokens
 */
const generateTokenPair = (user) => {
  const accessToken = generateToken(
    { 
      id: user._id, 
      userType: user.userType,
      email: user.email
    }
  );
  
  const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 1);
  
  return { accessToken, refreshToken };
};

// ==================== TOKEN VERIFICATION ====================

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object|null} Decoded token or null
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// ==================== TOKEN DECODING ====================

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {number|null} Expiry timestamp
 */
const getTokenExpiry = (token) => {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
const isTokenExpired = (token) => {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000;
};

// ==================== TOKEN BLACKLIST ====================

/**
 * Add token to blacklist
 * @param {string} token - Token to blacklist
 * @param {number} expiresIn - Seconds until token expires
 * @returns {Promise<boolean>}
 */
const blacklistToken = async (token, expiresIn) => {
  try {
    await TokenBlacklist.create({
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - Token to check
 * @returns {Promise<boolean>}
 */
const isTokenBlacklisted = async (token) => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

/**
 * Blacklist refresh token and all user tokens
 * @param {string} userId - User ID
 * @param {string} currentToken - Current refresh token
 * @returns {Promise<boolean>}
 */
const invalidateUserTokens = async (userId, currentToken = null) => {
  try {
    // Blacklist current token if provided
    if (currentToken) {
      const decoded = decodeToken(currentToken);
      if (decoded?.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await blacklistToken(currentToken, expiresIn);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error invalidating user tokens:', error);
    return false;
  }
};

/**
 * Cleanup expired blacklisted tokens
 * @returns {Promise<number>} Number of deleted tokens
 */
const cleanupBlacklistedTokens = async () => {
  try {
    const result = await TokenBlacklist.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up blacklisted tokens:', error);
    return 0;
  }
};

// ==================== TOKEN REFRESH ====================

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Object} user - User object
 * @returns {Promise<Object|null>} New tokens or null
 */
const refreshAccessToken = async (refreshToken, user) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return null;
    
    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(refreshToken);
    if (blacklisted) return null;
    
    // Check token version matches user
    if (decoded.version !== user.tokenVersion) return null;
    
    // Blacklist old refresh token
    const oldDecoded = decodeToken(refreshToken);
    if (oldDecoded?.exp) {
      const expiresIn = oldDecoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await blacklistToken(refreshToken, expiresIn);
      }
    }
    
    // Generate new tokens
    return generateTokenPair(user);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// ==================== RANDOM TOKENS ====================

/**
 * Generate random token (for email verification, password reset)
 * @param {number} length - Token length
 * @returns {string}
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
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
 * Hash token (for storing in database)
 * @param {string} token - Token to hash
 * @returns {string}
 */
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

// ==================== EXPORTS ====================
module.exports = {
  // Generation
  generateToken,
  generateRefreshToken,
  generateTokenPair,
  generateRandomToken,
  generateOTP,
  
  // Verification
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
  
  // Blacklist
  blacklistToken,
  isTokenBlacklisted,
  invalidateUserTokens,
  cleanupBlacklistedTokens,
  
  // Refresh
  refreshAccessToken,
  
  // Utilities
  hashToken
};