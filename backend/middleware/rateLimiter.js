// middleware/rateLimit.js - COMPLETE FIXED VERSION
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

// ==================== RATE LIMIT CONFIGURATION ====================
const RATE_LIMITS = {
  // General API limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later.'
  },
  
  // Auth routes (stricter)
  auth: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true // Don't count successful logins
  },
  
  // Registration (very strict)
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per IP per hour
    message: 'Too many registration attempts from this IP, please try again later.'
  },
  
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 reset attempts per hour
    message: 'Too many password reset attempts, please try again later.'
  },
  
  // Creator routes
  creator: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Too many requests, please slow down.'
  },
  
  // Brand routes
  brand: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Too many requests, please slow down.'
  },
  
  // Deal creation (prevent spam)
  dealCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 deals per hour
    message: 'Too many deals created from this IP, please try again later.'
  },
  
  // Message sending
  message: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: 'Too many messages sent, please slow down.'
  },
  
  // Search (moderate)
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please slow down.'
  },
  
  // Payment endpoints (strict)
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 payment attempts per hour
    message: 'Too many payment attempts, please try again later.'
  },
  
  // File upload (based on file size)
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 uploads per hour
    message: 'Too many upload attempts, please try again later.'
  },
  
  // Admin routes (higher limits)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window
    message: 'Too many requests, please slow down.'
  },
  
  // Public routes (higher limits)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Too many requests, please slow down.'
  }
};

// ==================== CREATE REDIS STORE IF AVAILABLE ====================
let store = null;
try {
  const redisClient = getRedisClient();
  if (redisClient) {
    store = new RedisStore({
      client: redisClient,
      prefix: 'rl:'
    });
    console.log('✅ Redis rate limit store initialized');
  }
} catch (error) {
  console.warn('⚠️ Redis not available, using memory store for rate limiting');
}

// ==================== HELPER TO CREATE RATE LIMITER ====================
const createRateLimiter = (config) => {
  const limiterConfig = {
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: config.message,
      retryAfter: Math.ceil(config.windowMs / 1000 / 60) // in minutes
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    
    // Custom key generator (include user ID if authenticated)
    keyGenerator: (req) => {
      const identifier = req.user?._id || req.ip;
      return identifier.toString();
    },
    
    // Skip certain requests
    skip: (req) => {
      // Skip for admin users
      if (req.user?.userType === 'admin') {
        return true;
      }
      return false;
    },
    
    // Handler when limit is exceeded
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000) // in seconds
      });
    }
  };

  if (store) {
    limiterConfig.store = store;
  }

  return rateLimit(limiterConfig);
};

// ==================== RATE LIMITERS ====================

// General API limiter
const apiLimiter = createRateLimiter(RATE_LIMITS.api);

// Auth route limiter
const authLimiter = createRateLimiter(RATE_LIMITS.auth);

// Registration limiter
const registerLimiter = createRateLimiter(RATE_LIMITS.register);

// Password reset limiter
const passwordResetLimiter = createRateLimiter(RATE_LIMITS.passwordReset);

// Creator routes limiter
const creatorLimiter = createRateLimiter(RATE_LIMITS.creator);

// Brand routes limiter
const brandLimiter = createRateLimiter(RATE_LIMITS.brand);

// Deal creation limiter
const dealCreationLimiter = createRateLimiter(RATE_LIMITS.dealCreation);

// Message limiter
const messageLimiter = createRateLimiter(RATE_LIMITS.message);

// Search limiter
const searchLimiter = createRateLimiter(RATE_LIMITS.search);

// Payment limiter
const paymentLimiter = createRateLimiter(RATE_LIMITS.payment);

// Upload limiter
const uploadLimiter = createRateLimiter(RATE_LIMITS.upload);

// Admin limiter
const adminLimiter = createRateLimiter(RATE_LIMITS.admin);

// Public routes limiter
const publicLimiter = createRateLimiter(RATE_LIMITS.public);

// ==================== CUSTOM RATE LIMITERS FOR SPECIFIC ENDPOINTS ====================

// Strict limiter for sensitive operations
const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: 'Too many attempts, please try again later.'
});

// Login rate limiter with tracking
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.body.email ? req.body.email : req.ip;
  }, 
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: 15 * 60
    });
  }
});

// ==================== RATE LIMIT BY USER ROLE ====================
const roleBasedLimiter = (roleLimits) => {
  return (req, res, next) => {
    const userRole = req.user?.userType || 'public';
    const limit = roleLimits[userRole] || roleLimits.default;
    
    // Create dynamic limiter based on role
    const limiter = createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: limit,
      message: `Rate limit exceeded. Your role allows ${limit} requests per 15 minutes.`
    });
    
    return limiter(req, res, next);
  };
};

// ==================== RATE LIMIT BY ENDPOINT ====================
const endpointLimiter = (endpoint) => {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.api;
  return createRateLimiter(config);
};

// ==================== DYNAMIC RATE LIMITER ====================
const dynamicRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = null,
    skip = null
  } = options;

  return createRateLimiter({
    windowMs,
    max,
    message,
    keyGenerator,
    skip
  });
};

// ==================== RATE LIMIT MIDDLEWARE FOR SENSITIVE ROUTES ====================
const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many sensitive operations. Please try again later.'
});

// ==================== RATE LIMIT FOR FILE UPLOADS (BASED ON SIZE) ====================
const uploadSizeLimiter = (maxSizeMB = 100) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${maxSizeMB}MB.`
      });
    }
    
    // Also apply rate limit
    uploadLimiter(req, res, next);
  };
};

// ==================== RATE LIMIT INFO MIDDLEWARE ====================
const rateLimitInfo = (req, res, next) => {
  // Add rate limit info to response locals
  res.locals.rateLimit = {
    limit: req.rateLimit?.limit,
    current: req.rateLimit?.current,
    remaining: req.rateLimit?.remaining,
    resetTime: req.rateLimit?.resetTime
  };
  next();
};

// ==================== CLEANUP OLD RATE LIMIT DATA ====================
const cleanupRateLimits = async () => {
  // This would be called by a cron job
  if (store && store.client) {
    try {
      const keys = await store.client.keys('rl:*');
      const now = Date.now();
      
      for (const key of keys) {
        const ttl = await store.client.ttl(key);
        if (ttl < 0) {
          await store.client.del(key);
        }
      }
      console.log(`🧹 Cleaned up ${keys.length} rate limit keys`);
    } catch (error) {
      console.error('Error cleaning up rate limits:', error);
    }
  }
};

// ==================== EXPORTS ====================
module.exports = {
  // General limiters
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  creatorLimiter,
  brandLimiter,
  dealCreationLimiter,
  messageLimiter,
  searchLimiter,
  paymentLimiter,
  uploadLimiter,
  adminLimiter,
  publicLimiter,
  
  // Specialized limiters
  loginLimiter,
  strictLimiter,
  sensitiveLimiter,
  
  // Factory functions
  createRateLimiter,
  roleBasedLimiter,
  endpointLimiter,
  dynamicRateLimiter,
  uploadSizeLimiter,
  
  // Utilities
  rateLimitInfo,
  cleanupRateLimits,
  
  // Constants
  RATE_LIMITS
};