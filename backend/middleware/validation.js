// middleware/validation.js - COMPLETE PRODUCTION-READY VERSION
const Joi = require('joi');
const { validationResult } = require('express-validator');

// ==================== JOI VALIDATION SCHEMAS ====================

// Auth validation schemas
const authSchemas = {
  register: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required',
      }),
    fullName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 50 characters',
      'string.pattern.base': 'Full name can only contain letters and spaces',
      'any.required': 'Full name is required',
    }),
    userType: Joi.string().valid('brand', 'creator').required().messages({
      'any.only': 'User type must be either brand or creator',
      'any.required': 'User type is required',
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
      'string.pattern.base': 'Please enter a valid phone number',
    }),
    brandName: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().min(2).max(100).required(),
      otherwise: Joi.optional(),
    }),
    industry: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().valid(
        'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
        'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
        'Finance', 'Education', 'Entertainment', 'Sports', 'Other'
      ).required(),
      otherwise: Joi.optional(),
    }),
    website: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().uri().optional(),
      otherwise: Joi.optional(),
    }),
    displayName: Joi.when('userType', {
      is: 'creator',
      then: Joi.string().min(2).max(50).required(),
      otherwise: Joi.optional(),
    }),
    handle: Joi.when('userType', {
      is: 'creator',
      then: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
          'string.pattern.base': 'Handle can only contain letters, numbers, and underscores',
        }),
      otherwise: Joi.optional(),
    }),
    niches: Joi.when('userType', {
      is: 'creator',
      then: Joi.array()
        .items(
          Joi.string().valid(
            'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food',
            'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
            'Education', 'Entertainment', 'Sports', 'Health', 'Wellness',
            'Photography', 'Art', 'Music', 'Business'
          )
        )
        .min(1)
        .max(5)
        .optional(),
      otherwise: Joi.optional(),
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    userType: Joi.string().valid('brand', 'creator').required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .invalid(Joi.ref('currentPassword'))
      .messages({
        'any.invalid': 'New password must be different from current password',
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
      }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  sendOTP: Joi.object({
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  }).or('email', 'phone'),

  verifyOTP: Joi.object({
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }).or('email', 'phone'),
};

// Campaign validation schemas
const campaignSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(20).max(2000).required(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
      'Finance', 'Education', 'Entertainment', 'Sports', 'Other'
    ).required(),
    objectives: Joi.array().items(Joi.string()).optional(),
    deliverables: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid('post', 'story', 'reel', 'video', 'blog', 'review', 'image', 'other').required(),
          platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin', 'website', 'other').required(),
          quantity: Joi.number().integer().min(1).max(100).required(),
          description: Joi.string().max(500).optional(),
          requirements: Joi.string().max(1000).optional(),
          budget: Joi.number().min(0).optional(),
        })
      )
      .min(1)
      .required(),
    budget: Joi.number().min(10).max(1000000).required(),
    budgetType: Joi.string().valid('fixed', 'outcome-based').default('fixed'),
    paymentTerms: Joi.string().valid('escrow', 'half', 'full').default('escrow'),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    submissionDeadline: Joi.date().less(Joi.ref('endDate')).optional(),
    targetAudience: Joi.object({
      minFollowers: Joi.number().min(0).optional(),
      maxFollowers: Joi.number().min(0).optional(),
      minEngagement: Joi.number().min(0).max(100).optional(),
      locations: Joi.array().items(Joi.string()).optional(),
      ages: Joi.array().items(Joi.string().valid('18-24', '25-34', '35-44', '45+')).optional(),
      genders: Joi.array().items(Joi.string().valid('male', 'female', 'all')).optional(),
      niches: Joi.array().items(Joi.string()).optional(),
      platforms: Joi.array().items(Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook')).optional(),
    }).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100).optional(),
    description: Joi.string().min(20).max(2000).optional(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
      'Finance', 'Education', 'Entertainment', 'Sports', 'Other'
    ).optional(),
    budget: Joi.number().min(10).max(1000000).optional(),
    status: Joi.string().valid('draft', 'pending', 'active', 'paused', 'completed', 'archived').optional(),
    targetAudience: Joi.object({
      minFollowers: Joi.number().min(0),
      maxFollowers: Joi.number().min(0),
      minEngagement: Joi.number().min(0).max(100),
      locations: Joi.array().items(Joi.string()),
      ages: Joi.array().items(Joi.string().valid('18-24', '25-34', '35-44', '45+')),
      genders: Joi.array().items(Joi.string().valid('male', 'female', 'all')),
      niches: Joi.array().items(Joi.string()),
      platforms: Joi.array().items(Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook')),
    }).optional(),
  }),
};

// Deal validation schemas
const dealSchemas = {
  create: Joi.object({
    campaignId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    creatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    budget: Joi.number().min(10).max(1000000).required(),
    deadline: Joi.date().greater('now').required(),
    deliverables: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid('post', 'story', 'reel', 'video', 'blog', 'review').required(),
          platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook').required(),
          description: Joi.string().max(500).optional(),
          quantity: Joi.number().integer().min(1).max(100).default(1),
        })
      )
      .min(1)
      .required(),
    terms: Joi.string().max(2000).optional(),
    paymentTerms: Joi.string().valid('escrow', 'half', 'full').default('escrow'),
  }),

  update: Joi.object({
    status: Joi.string().valid(
      'pending', 'accepted', 'declined', 'in-progress',
      'completed', 'cancelled', 'disputed', 'revision'
    ).optional(),
    paymentStatus: Joi.string().valid(
      'pending', 'in-escrow', 'released', 'refunded', 'failed'
    ).optional(),
  }),

  counterOffer: Joi.object({
    budget: Joi.number().min(10).max(1000000).required(),
    deadline: Joi.date().greater('now').required(),
    message: Joi.string().max(500).optional(),
  }),

  revision: Joi.object({
    deliverableId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    notes: Joi.string().min(10).max(1000).required(),
  }),
};

// Payment validation schemas
const paymentSchemas = {
  createEscrow: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  }),

  addPaymentMethod: Joi.object({
    type: Joi.string().valid('credit_card', 'bank_account', 'paypal').required(),

    // Credit card fields
    cardNumber: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string().pattern(/^\d{16}$/).required(),
      otherwise: Joi.optional(),
    }),
    expiryMonth: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number().min(1).max(12).required(),
      otherwise: Joi.optional(),
    }),
    expiryYear: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number().min(new Date().getFullYear()).max(2100).required(),
      otherwise: Joi.optional(),
    }),
    cvv: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string().pattern(/^\d{3,4}$/).required(),
      otherwise: Joi.optional(),
    }),

    // Bank account fields
    bankName: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().required(),
      otherwise: Joi.optional(),
    }),
    accountNumber: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().pattern(/^\d{8,17}$/).required(),
      otherwise: Joi.optional(),
    }),
    routingNumber: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().pattern(/^\d{9}$/).required(),
      otherwise: Joi.optional(),
    }),
    accountHolderName: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().required(),
      otherwise: Joi.optional(),
    }),

    // PayPal fields
    paypalEmail: Joi.when('type', {
      is: 'paypal',
      then: Joi.string().email().required(),
      otherwise: Joi.optional(),
    }),
  }),

  withdrawal: Joi.object({
    amount: Joi.number().min(50).max(100000).required(),
    methodId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  }),
};

// Message validation schemas
const messageSchemas = {
  send: Joi.object({
    content: Joi.string().max(5000).optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          type: Joi.string().valid('image', 'video', 'document', 'audio').required(),
          filename: Joi.string().optional(),
          size: Joi.number().max(100 * 1024 * 1024).optional(),
        })
      )
      .max(10)
      .optional(),
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    repliedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    contentType: Joi.string().valid('text', 'image', 'video', 'file', 'deal_offer', 'payment').default('text'),
  }).or('content', 'attachments'),

  createConversation: Joi.object({
    participantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    campaignId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    initialMessage: Joi.string().max(5000).optional(),
  }),
};

// Review validation schemas
const reviewSchemas = {
  create: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().max(100).optional(),
    content: Joi.string().min(10).max(500).required(),
    pros: Joi.array().items(Joi.string()).max(5).optional(),
    cons: Joi.array().items(Joi.string()).max(5).optional(),
    criteria: Joi.object({
      communication: Joi.number().min(1).max(5).optional(),
      quality: Joi.number().min(1).max(5).optional(),
      timeliness: Joi.number().min(1).max(5).optional(),
      professionalism: Joi.number().min(1).max(5).optional(),
      value: Joi.number().min(1).max(5).optional(),
    }).optional(),
  }),
};

// Dispute validation schemas
const disputeSchemas = {
  create: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('deliverables', 'payment', 'contract', 'communication', 'other').required(),
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(20).max(2000).required(),
    evidence: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          type: Joi.string().required(),
          description: Joi.string().max(500).optional(),
        })
      )
      .max(10)
      .optional(),
  }),

  addMessage: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    attachments: Joi.array().items(Joi.string().uri()).max(5).optional(),
    isInternal: Joi.boolean().default(false),
  }),
};

// Search validation schemas
const searchSchemas = {
  creators: Joi.object({
    q: Joi.string().max(100).optional(),
    niche: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
    minFollowers: Joi.number().min(0).optional(),
    maxFollowers: Joi.number().min(0).optional(),
    minEngagement: Joi.number().min(0).max(100).optional(),
    platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter').optional(),
    location: Joi.string().optional(),
    verified: Joi.boolean().optional(),
    available: Joi.boolean().optional(),
    sort: Joi.string().valid('relevance', 'followers_desc', 'followers_asc', 'engagement_desc', 'engagement_asc', 'newest').default('relevance'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
  }),

  campaigns: Joi.object({
    q: Joi.string().max(100).optional(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
      'Finance', 'Education', 'Entertainment', 'Sports', 'Other'
    ).optional(),
    minBudget: Joi.number().min(0).optional(),
    maxBudget: Joi.number().min(0).optional(),
    platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook').optional(),
    status: Joi.string().valid('active', 'completed', 'draft').default('active'),
    sort: Joi.string().valid('newest', 'budget_desc', 'budget_asc', 'deadline_asc').default('newest'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
  }),
};

// Admin validation schemas
const adminSchemas = {
  updateUser: Joi.object({
    fullName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending').optional(),
    isVerified: Joi.boolean().optional(),
    notes: Joi.string().max(500).optional(),
    role: Joi.string().valid('admin', 'moderator').optional(),
  }),

  suspendUser: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
    duration: Joi.number().min(1).max(365).optional(),
  }),

  approveItem: Joi.object({
    notes: Joi.string().max(500).optional(),
  }),

  rejectItem: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
  }),
};

// Common validation schemas
const commonSchemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid ID format',
  }),

  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),
};

// ==================== VALIDATION MIDDLEWARE FUNCTIONS ====================

/**
 * Generic Joi validation middleware
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  req.body = value;
  next();
};

/**
 * Query parameter validation
 * @param {Joi.ObjectSchema} schema - Joi schema for query
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  req.query = value;
  next();
};

/**
 * URL parameters validation
 * @param {Joi.ObjectSchema} schema - Joi schema for params
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  req.params = value;
  next();
};

/**
 * Express-validator validation result handler (for legacy compatibility)
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * ObjectId validation middleware
 * @param {string} paramName - Parameter name to validate (default: 'id')
 * @returns {Function} Express middleware
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: `Invalid ${paramName} format`,
    });
  }
  next();
};

/**
 * Pagination validation middleware
 * @returns {Function} Express middleware
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({ success: false, error: 'Page must be greater than 0' });
  }
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, error: 'Limit must be between 1 and 100' });
  }

  req.pagination = { page, limit };
  next();
};

/**
 * Date range validation middleware
 * @returns {Function} Express middleware
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    if (start > end) {
      return res.status(400).json({ success: false, error: 'Start date must be before end date' });
    }
    // Optional: limit range to 90 days
    if (end - start > 90 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, error: 'Date range cannot exceed 90 days' });
    }
  }
  next();
};

// ==================== EXPORTS ====================
module.exports = {
  // Joi schemas
  authSchemas,
  campaignSchemas,
  dealSchemas,
  paymentSchemas,
  messageSchemas,
  reviewSchemas,
  disputeSchemas,
  searchSchemas,
  adminSchemas,
  commonSchemas,

  // Validation middleware
  validate,
  validateQuery,
  validateParams,
  validateRequest,
  validateObjectId,
  validatePagination,
  validateDateRange,
};