const { body, param, query, check } = require('express-validator');

// Auth validations
const authValidations = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    
    body('fullName')
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),
    
    body('userType')
      .isIn(['brand', 'creator'])
      .withMessage('User type must be brand or creator'),
    
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number'),
    
    // Brand specific
    body('brandName')
      .if(body('userType').equals('brand'))
      .notEmpty()
      .withMessage('Brand name is required for brand accounts'),
    
    // Creator specific
    body('displayName')
      .if(body('userType').equals('creator'))
      .notEmpty()
      .withMessage('Display name is required for creator accounts'),
    
    body('handle')
      .if(body('userType').equals('creator'))
      .notEmpty()
      .withMessage('Handle is required for creator accounts')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Handle can only contain letters, numbers, and underscores')
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    body('userType')
      .isIn(['brand', 'creator'])
      .withMessage('User type must be brand or creator')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain uppercase, lowercase, and number')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('New password must be different from current password')
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail()
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
  ]
};

// Campaign validations
const campaignValidations = {
  create: [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    
    body('category')
      .isIn(['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'])
      .withMessage('Invalid category'),
    
    body('budget')
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('startDate')
      .isISO8601()
      .withMessage('Invalid start date')
      .custom(value => new Date(value) > new Date())
      .withMessage('Start date must be in the future'),
    
    body('endDate')
      .isISO8601()
      .withMessage('Invalid end date')
      .custom((value, { req }) => new Date(value) > new Date(req.body.startDate))
      .withMessage('End date must be after start date'),
    
    body('deliverables')
      .isArray({ min: 1 })
      .withMessage('At least one deliverable is required'),
    
    body('deliverables.*.type')
      .isIn(['post', 'story', 'reel', 'video', 'blog', 'review', 'other'])
      .withMessage('Invalid deliverable type'),
    
    body('deliverables.*.platform')
      .isIn(['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other'])
      .withMessage('Invalid platform'),
    
    body('deliverables.*.quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100')
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    body('title')
      .optional()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    
    body('budget')
      .optional()
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000')
  ]
};

// Deal validations
const dealValidations = {
  create: [
    body('campaignId')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    body('creatorId')
      .isMongoId()
      .withMessage('Invalid creator ID'),
    
    body('budget')
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('deadline')
      .isISO8601()
      .withMessage('Invalid deadline')
      .custom(value => new Date(value) > new Date())
      .withMessage('Deadline must be in the future'),
    
    body('deliverables')
      .isArray({ min: 1 })
      .withMessage('At least one deliverable is required'),
    
    body('deliverables.*.type')
      .isIn(['post', 'story', 'reel', 'video', 'blog', 'review'])
      .withMessage('Invalid deliverable type')
  ],

  updateStatus: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('status')
      .isIn(['accepted', 'declined', 'in-progress', 'completed', 'cancelled'])
      .withMessage('Invalid status')
  ]
};

// Payment validations
const paymentValidations = {
  createEscrow: [
    body('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  addPaymentMethod: [
    body('type')
      .isIn(['credit_card', 'bank_account', 'paypal'])
      .withMessage('Invalid payment method type'),
    
    body('cardNumber')
      .if(body('type').equals('credit_card'))
      .matches(/^\d{16}$/)
      .withMessage('Invalid card number'),
    
    body('expiryMonth')
      .if(body('type').equals('credit_card'))
      .isInt({ min: 1, max: 12 })
      .withMessage('Invalid expiry month'),
    
    body('expiryYear')
      .if(body('type').equals('credit_card'))
      .isInt({ min: new Date().getFullYear() })
      .withMessage('Invalid expiry year'),
    
    body('cvv')
      .if(body('type').equals('credit_card'))
      .matches(/^\d{3,4}$/)
      .withMessage('Invalid CVV')
  ],

  withdrawal: [
    body('amount')
      .isFloat({ min: 50, max: 100000 })
      .withMessage('Amount must be between $50 and $100,000'),
    
    body('methodId')
      .isMongoId()
      .withMessage('Invalid payment method ID')
  ]
};

// Message validations
const messageValidations = {
  send: [
    param('conversationId')
      .isMongoId()
      .withMessage('Invalid conversation ID'),
    
    body('content')
      .optional()
      .isString()
      .isLength({ max: 5000 })
      .withMessage('Message cannot exceed 5000 characters'),
    
    body('attachments')
      .optional()
      .isArray()
      .custom(attachments => {
        if (attachments.length > 10) {
          throw new Error('Cannot attach more than 10 files');
        }
        return true;
      }),
    
    body('dealId')
      .optional()
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  reaction: [
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID'),
    
    body('reaction')
      .isIn(['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'])
      .withMessage('Invalid reaction')
  ]
};

// Review validations
const reviewValidations = {
  create: [
    body('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    body('content')
      .isLength({ min: 10, max: 500 })
      .withMessage('Review must be between 10 and 500 characters'),
    
    body('pros')
      .optional()
      .isArray()
      .custom(pros => pros.length <= 5)
      .withMessage('Cannot have more than 5 pros'),
    
    body('cons')
      .optional()
      .isArray()
      .custom(cons => cons.length <= 5)
      .withMessage('Cannot have more than 5 cons')
  ]
};

// Search validations
const searchValidations = {
  creators: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('minFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min followers must be a positive number'),
    
    query('maxFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max followers must be a positive number'),
    
    query('minEngagement')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Min engagement must be between 0 and 100')
  ],

  campaigns: [
    query('minBudget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min budget must be a positive number'),
    
    query('maxBudget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max budget must be a positive number')
  ]
};

// Common validations
const commonValidations = {
  objectId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ],

  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format')
      .toDate(),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .toDate()
      .custom((value, { req }) => {
        if (req.query.startDate && value <= req.query.startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ]
};

module.exports = {
  authValidations,
  campaignValidations,
  dealValidations,
  paymentValidations,
  messageValidations,
  reviewValidations,
  searchValidations,
  commonValidations
};