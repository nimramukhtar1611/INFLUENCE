const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ==================== AUTH VALIDATIONS ====================
const authValidations = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail()
      .custom(async (email) => {
        const User = require('../models/User');
        const user = await User.findOne({ email });
        if (user) {
          throw new Error('Email already in use');
        }
        return true;
      }),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
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
      .withMessage('Brand name is required for brand accounts')
      .isLength({ min: 2, max: 100 })
      .withMessage('Brand name must be between 2 and 100 characters'),
    
    body('industry')
      .if(body('userType').equals('brand'))
      .isIn(['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'])
      .withMessage('Please select a valid industry'),
    
    body('website')
      .if(body('userType').equals('brand'))
      .optional()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    // Creator specific
    body('displayName')
      .if(body('userType').equals('creator'))
      .notEmpty()
      .withMessage('Display name is required for creator accounts')
      .isLength({ min: 2, max: 50 })
      .withMessage('Display name must be between 2 and 50 characters'),
    
    body('handle')
      .if(body('userType').equals('creator'))
      .notEmpty()
      .withMessage('Handle is required for creator accounts')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Handle can only contain letters, numbers, and underscores')
      .isLength({ min: 3, max: 30 })
      .withMessage('Handle must be between 3 and 30 characters')
      .custom(async (handle) => {
        const Creator = require('../models/Creator');
        const creator = await Creator.findOne({ handle });
        if (creator) {
          throw new Error('Handle already taken');
        }
        return true;
      }),
    
    body('niches')
      .if(body('userType').equals('creator'))
      .optional()
      .isArray()
      .withMessage('Niches must be an array')
      .custom((niches) => niches.length <= 5)
      .withMessage('You can select up to 5 niches')
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
  ],

  verifyEmail: [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required')
  ],

  sendOTP: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number')
  ],

  verifyOTP: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number'),
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],

  refreshToken: [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ]
};

// ==================== USER VALIDATIONS ====================
const userValidations = {
  updateProfile: [
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),
    
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number'),
    
    body('profilePicture')
      .optional()
      .isURL()
      .withMessage('Please enter a valid URL for profile picture'),
    
    body('coverPicture')
      .optional()
      .isURL()
      .withMessage('Please enter a valid URL for cover picture'),
    
    body('settings.language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'ar', 'hi', 'zh', 'ja'])
      .withMessage('Please select a valid language'),
    
    body('settings.timezone')
      .optional()
      .isIn(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 
             'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'])
      .withMessage('Please select a valid timezone'),
    
    body('settings.notifications')
      .optional()
      .isObject()
      .withMessage('Notifications must be an object'),
    
    body('settings.privacy')
      .optional()
      .isObject()
      .withMessage('Privacy settings must be an object')
  ],

  updatePreferences: [
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'system'])
      .withMessage('Theme must be light, dark, or system'),
    
    body('notifications')
      .optional()
      .isObject()
      .withMessage('Notifications must be an object'),
    
    body('privacy')
      .optional()
      .isObject()
      .withMessage('Privacy settings must be an object')
  ],

  setup2FA: [
    body('method')
      .isIn(['app', 'sms', 'email'])
      .withMessage('2FA method must be app, sms, or email')
  ],

  verify2FA: [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('Token must be 6 digits')
  ]
};

// ==================== BRAND VALIDATIONS ====================
const brandValidations = {
  updateProfile: [
    body('brandName')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Brand name must be between 2 and 100 characters'),
    
    body('industry')
      .optional()
      .isIn(['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'])
      .withMessage('Please select a valid industry'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('founded')
      .optional()
      .matches(/^\d{4}$/)
      .withMessage('Founded year must be a valid 4-digit year'),
    
    body('employees')
      .optional()
      .isIn(['1-10', '11-50', '51-200', '201-500', '500+'])
      .withMessage('Please select a valid employee range'),
    
    body('address.street')
      .optional()
      .isString()
      .withMessage('Street must be a string'),
    
    body('address.city')
      .optional()
      .isString()
      .withMessage('City must be a string'),
    
    body('address.state')
      .optional()
      .isString()
      .withMessage('State must be a string'),
    
    body('address.country')
      .optional()
      .isString()
      .withMessage('Country must be a string'),
    
    body('address.zipCode')
      .optional()
      .isString()
      .withMessage('ZIP code must be a string'),
    
    body('socialMedia.instagram')
      .optional()
      .isURL()
      .withMessage('Please enter a valid Instagram URL'),
    
    body('socialMedia.twitter')
      .optional()
      .isURL()
      .withMessage('Please enter a valid Twitter URL'),
    
    body('socialMedia.facebook')
      .optional()
      .isURL()
      .withMessage('Please enter a valid Facebook URL'),
    
    body('socialMedia.linkedin')
      .optional()
      .isURL()
      .withMessage('Please enter a valid LinkedIn URL'),
    
    body('socialMedia.youtube')
      .optional()
      .isURL()
      .withMessage('Please enter a valid YouTube URL'),
    
    body('socialMedia.tiktok')
      .optional()
      .isURL()
      .withMessage('Please enter a valid TikTok URL'),
    
    body('preferences.preferredNiches')
      .optional()
      .isArray()
      .withMessage('Preferred niches must be an array'),
    
    body('preferences.preferredPlatforms')
      .optional()
      .isArray()
      .withMessage('Preferred platforms must be an array'),
    
    body('preferences.minFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min followers must be a positive number'),
    
    body('preferences.maxFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max followers must be a positive number'),
    
    body('preferences.minEngagement')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Min engagement must be between 0 and 100')
  ],

  addTeamMember: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    
    body('role')
      .isIn(['admin', 'manager', 'member'])
      .withMessage('Role must be admin, manager, or member'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
  ],

  updateTeamMember: [
    param('memberId')
      .isMongoId()
      .withMessage('Invalid member ID'),
    
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'member'])
      .withMessage('Role must be admin, manager, or member'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
  ]
};

// ==================== CREATOR VALIDATIONS ====================
const creatorValidations = {
  updateProfile: [
    body('displayName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Display name must be between 2 and 50 characters'),
    
    body('handle')
      .optional()
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Handle can only contain letters, numbers, and underscores')
      .isLength({ min: 3, max: 30 })
      .withMessage('Handle must be between 3 and 30 characters')
      .custom(async (handle, { req }) => {
        const Creator = require('../models/Creator');
        const creator = await Creator.findOne({ handle, _id: { $ne: req.user._id } });
        if (creator) {
          throw new Error('Handle already taken');
        }
        return true;
      }),
    
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    body('birthday')
      .optional()
      .isDate()
      .withMessage('Please enter a valid date')
      .custom(value => new Date(value) < new Date())
      .withMessage('Birthday must be in the past'),
    
    body('gender')
      .optional()
      .isIn(['male', 'female', 'non-binary', 'prefer-not'])
      .withMessage('Please select a valid gender option'),
    
    body('niches')
      .optional()
      .isArray()
      .withMessage('Niches must be an array')
      .custom((niches) => niches.length <= 5)
      .withMessage('You can select up to 5 niches'),
    
    body('socialMedia.instagram.handle')
      .optional()
      .isString()
      .withMessage('Instagram handle must be a string'),
    
    body('socialMedia.instagram.followers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Followers must be a positive number'),
    
    body('socialMedia.youtube.handle')
      .optional()
      .isString()
      .withMessage('YouTube handle must be a string'),
    
    body('socialMedia.youtube.subscribers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Subscribers must be a positive number'),
    
    body('socialMedia.tiktok.handle')
      .optional()
      .isString()
      .withMessage('TikTok handle must be a string'),
    
    body('socialMedia.tiktok.followers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Followers must be a positive number'),
    
    body('rateCard.instagram.post')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Rate must be a positive number'),
    
    body('rateCard.instagram.story')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Rate must be a positive number'),
    
    body('rateCard.youtube.video')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Rate must be a positive number'),
    
    body('rateCard.tiktok.video')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Rate must be a positive number'),
    
    body('availability.status')
      .optional()
      .isIn(['available', 'busy', 'unavailable'])
      .withMessage('Status must be available, busy, or unavailable'),
    
    body('availability.maxActiveDeals')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Max active deals must be between 1 and 20')
  ],

  addPortfolio: [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('mediaUrl')
      .notEmpty()
      .withMessage('Media URL is required')
      .isURL()
      .withMessage('Please enter a valid URL'),
    
    body('platform')
      .isIn(['instagram', 'youtube', 'tiktok', 'other'])
      .withMessage('Platform must be instagram, youtube, tiktok, or other'),
    
    body('brand')
      .optional()
      .isString()
      .withMessage('Brand must be a string'),
    
    body('campaign')
      .optional()
      .isString()
      .withMessage('Campaign must be a string'),
    
    body('performance.views')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Views must be a positive number'),
    
    body('performance.likes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Likes must be a positive number'),
    
    body('performance.comments')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Comments must be a positive number')
  ],

  updateAvailability: [
    body('status')
      .optional()
      .isIn(['available', 'busy', 'unavailable'])
      .withMessage('Status must be available, busy, or unavailable'),
    
    body('nextAvailable')
      .optional()
      .isDate()
      .withMessage('Please enter a valid date'),
    
    body('maxActiveDeals')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Max active deals must be between 1 and 20')
  ]
};

// ==================== CAMPAIGN VALIDATIONS ====================
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
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'])
      .withMessage('Please select a valid category'),
    
    body('objectives')
      .optional()
      .isArray()
      .withMessage('Objectives must be an array'),
    
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
      .withMessage('Quantity must be between 1 and 100'),
    
    body('deliverables.*.description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('deliverables.*.requirements')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Requirements cannot exceed 1000 characters'),
    
    body('deliverables.*.budget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Budget must be a positive number'),
    
    body('budget')
      .notEmpty()
      .withMessage('Budget is required')
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('budgetType')
      .optional()
      .isIn(['fixed', 'outcome-based'])
      .withMessage('Budget type must be fixed or outcome-based'),
    
    body('paymentTerms')
      .optional()
      .isIn(['escrow', 'half', 'full'])
      .withMessage('Payment terms must be escrow, half, or full'),
    
    body('startDate')
      .notEmpty()
      .withMessage('Start date is required')
      .isISO8601()
      .withMessage('Invalid start date format')
      .custom(value => new Date(value) > new Date())
      .withMessage('Start date must be in the future'),
    
    body('endDate')
      .notEmpty()
      .withMessage('End date is required')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => new Date(value) > new Date(req.body.startDate))
      .withMessage('End date must be after start date'),
    
    body('submissionDeadline')
      .optional()
      .isISO8601()
      .withMessage('Invalid submission deadline format'),
    
    body('targetAudience.minFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min followers must be a positive number'),
    
    body('targetAudience.maxFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max followers must be a positive number'),
    
    body('targetAudience.minEngagement')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Min engagement must be between 0 and 100'),
    
    body('targetAudience.locations')
      .optional()
      .isArray()
      .withMessage('Locations must be an array'),
    
    body('targetAudience.ages')
      .optional()
      .isArray()
      .withMessage('Age groups must be an array'),
    
    body('targetAudience.genders')
      .optional()
      .isArray()
      .withMessage('Genders must be an array'),
    
    body('targetAudience.niches')
      .optional()
      .isArray()
      .withMessage('Niches must be an array'),
    
    body('targetAudience.platforms')
      .optional()
      .isArray()
      .withMessage('Platforms must be an array'),
    
    body('requirements')
      .optional()
      .isArray()
      .withMessage('Requirements must be an array'),
    
    body('brandAssets.*.name')
      .optional()
      .isString()
      .withMessage('Asset name must be a string'),
    
    body('brandAssets.*.fileUrl')
      .optional()
      .isURL()
      .withMessage('Please enter a valid URL for asset')
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    body('title')
      .optional()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    
    body('description')
      .optional()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    
    body('budget')
      .optional()
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('status')
      .optional()
      .isIn(['draft', 'pending', 'active', 'paused', 'completed', 'archived'])
      .withMessage('Invalid status')
  ],

  inviteCreator: [
    param('id')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    body('creatorId')
      .isMongoId()
      .withMessage('Invalid creator ID'),
    
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters')
  ],

  reviewApplication: [
    param('campaignId')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    param('applicationId')
      .isMongoId()
      .withMessage('Invalid application ID'),
    
    body('status')
      .isIn(['accepted', 'rejected'])
      .withMessage('Status must be accepted or rejected'),
    
    body('feedback')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Feedback cannot exceed 500 characters')
  ]
};

// ==================== DEAL VALIDATIONS ====================
const dealValidations = {
  create: [
    body('campaignId')
      .isMongoId()
      .withMessage('Invalid campaign ID'),
    
    body('creatorId')
      .isMongoId()
      .withMessage('Invalid creator ID'),
    
    body('budget')
      .notEmpty()
      .withMessage('Budget is required')
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('deadline')
      .notEmpty()
      .withMessage('Deadline is required')
      .isISO8601()
      .withMessage('Invalid deadline format')
      .custom(value => new Date(value) > new Date())
      .withMessage('Deadline must be in the future'),
    
    body('deliverables')
      .isArray({ min: 1 })
      .withMessage('At least one deliverable is required'),
    
    body('deliverables.*.type')
      .isIn(['post', 'story', 'reel', 'video', 'blog', 'review', 'other'])
      .withMessage('Invalid deliverable type'),
    
    body('deliverables.*.platform')
      .isIn(['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other'])
      .withMessage('Invalid platform'),
    
    body('deliverables.*.description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('deliverables.*.quantity')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100'),
    
    body('terms')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Terms cannot exceed 2000 characters'),
    
    body('paymentTerms')
      .optional()
      .isIn(['escrow', 'half', 'full'])
      .withMessage('Payment terms must be escrow, half, or full')
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('status')
      .optional()
      .isIn(['pending', 'accepted', 'declined', 'in-progress', 'completed', 'cancelled', 'disputed', 'revision'])
      .withMessage('Invalid status'),
    
    body('paymentStatus')
      .optional()
      .isIn(['pending', 'in-escrow', 'released', 'refunded', 'failed'])
      .withMessage('Invalid payment status'),
    
    body('progress')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100')
  ],

  counterOffer: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('budget')
      .isFloat({ min: 10, max: 1000000 })
      .withMessage('Budget must be between $10 and $1,000,000'),
    
    body('deadline')
      .isISO8601()
      .withMessage('Invalid deadline format')
      .custom(value => new Date(value) > new Date())
      .withMessage('Deadline must be in the future'),
    
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters')
  ],

  revision: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('deliverableId')
      .isMongoId()
      .withMessage('Invalid deliverable ID'),
    
    body('notes')
      .notEmpty()
      .withMessage('Revision notes are required')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Revision notes must be between 10 and 1000 characters')
  ],

  accept: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  reject: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],

  cancel: [
    param('id')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ]
};

// ==================== DELIVERABLE VALIDATIONS ====================
const deliverableValidations = {
  submit: [
    param('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('deliverableId')
      .optional()
      .isMongoId()
      .withMessage('Invalid deliverable ID'),
    
    body('type')
      .optional()
      .isIn(['post', 'story', 'reel', 'video', 'blog', 'review', 'image', 'other'])
      .withMessage('Invalid deliverable type'),
    
    body('platform')
      .optional()
      .isIn(['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'website', 'other'])
      .withMessage('Invalid platform'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('links')
      .optional()
      .isArray()
      .withMessage('Links must be an array')
  ],

  updateMetrics: [
    param('deliverableId')
      .isMongoId()
      .withMessage('Invalid deliverable ID'),
    
    body('metrics.views')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Views must be a positive number'),
    
    body('metrics.likes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Likes must be a positive number'),
    
    body('metrics.comments')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Comments must be a positive number'),
    
    body('metrics.shares')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Shares must be a positive number'),
    
    body('metrics.clicks')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Clicks must be a positive number'),
    
    body('metrics.conversions')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Conversions must be a positive number')
  ],

  approve: [
    param('deliverableId')
      .isMongoId()
      .withMessage('Invalid deliverable ID'),
    
    body('feedback')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Feedback cannot exceed 500 characters')
  ],

  requestRevision: [
    param('deliverableId')
      .isMongoId()
      .withMessage('Invalid deliverable ID'),
    
    body('notes')
      .notEmpty()
      .withMessage('Revision notes are required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Revision notes must be between 10 and 500 characters')
  ]
};

// ==================== PAYMENT VALIDATIONS ====================
const paymentValidations = {
  createEscrow: [
    body('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  confirmEscrow: [
    param('paymentId')
      .isMongoId()
      .withMessage('Invalid payment ID'),
    
    body('paymentIntentId')
      .notEmpty()
      .withMessage('Payment intent ID is required')
  ],

  releasePayment: [
    param('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  requestWithdrawal: [
    body('amount')
      .isFloat({ min: 50, max: 100000 })
      .withMessage('Amount must be between $50 and $100,000'),
    
    body('methodId')
      .isMongoId()
      .withMessage('Invalid payment method ID')
  ],

  addPaymentMethod: [
    body('type')
      .isIn(['credit_card', 'bank_account', 'paypal'])
      .withMessage('Invalid payment method type'),
    
    // Credit card fields
    body('cardNumber')
      .if(body('type').equals('credit_card'))
      .notEmpty()
      .withMessage('Card number is required')
      .matches(/^\d{16}$/)
      .withMessage('Invalid card number'),
    
    body('expiryMonth')
      .if(body('type').equals('credit_card'))
      .notEmpty()
      .withMessage('Expiry month is required')
      .isInt({ min: 1, max: 12 })
      .withMessage('Invalid expiry month'),
    
    body('expiryYear')
      .if(body('type').equals('credit_card'))
      .notEmpty()
      .withMessage('Expiry year is required')
      .isInt({ min: new Date().getFullYear() })
      .withMessage('Invalid expiry year'),
    
    body('cvv')
      .if(body('type').equals('credit_card'))
      .notEmpty()
      .withMessage('CVV is required')
      .matches(/^\d{3,4}$/)
      .withMessage('Invalid CVV'),
    
    // Bank account fields
    body('bankName')
      .if(body('type').equals('bank_account'))
      .notEmpty()
      .withMessage('Bank name is required')
      .isString()
      .withMessage('Bank name must be a string'),
    
    body('accountNumber')
      .if(body('type').equals('bank_account'))
      .notEmpty()
      .withMessage('Account number is required')
      .matches(/^\d{8,17}$/)
      .withMessage('Invalid account number'),
    
    body('routingNumber')
      .if(body('type').equals('bank_account'))
      .notEmpty()
      .withMessage('Routing number is required')
      .matches(/^\d{9}$/)
      .withMessage('Invalid routing number'),
    
    body('accountHolderName')
      .if(body('type').equals('bank_account'))
      .notEmpty()
      .withMessage('Account holder name is required')
      .isString()
      .withMessage('Account holder name must be a string'),
    
    // PayPal fields
    body('paypalEmail')
      .if(body('type').equals('paypal'))
      .notEmpty()
      .withMessage('PayPal email is required')
      .isEmail()
      .withMessage('Please enter a valid PayPal email')
  ],

  setDefaultMethod: [
    param('methodId')
      .isMongoId()
      .withMessage('Invalid payment method ID')
  ],

  deletePaymentMethod: [
    param('methodId')
      .isMongoId()
      .withMessage('Invalid payment method ID')
  ],

  refund: [
    param('paymentId')
      .isMongoId()
      .withMessage('Invalid payment ID'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ]
};

// ==================== MESSAGE VALIDATIONS ====================
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
      .withMessage('Invalid deal ID'),
    
    body('repliedTo')
      .optional()
      .isMongoId()
      .withMessage('Invalid message ID'),
    
    body('contentType')
      .optional()
      .isIn(['text', 'image', 'video', 'file', 'deal_offer', 'payment'])
      .withMessage('Invalid content type')
  ],

  startConversation: [
    body('recipientId')
      .isMongoId()
      .withMessage('Invalid recipient ID'),
    
    body('message')
      .optional()
      .isString()
      .isLength({ max: 5000 })
      .withMessage('Message cannot exceed 5000 characters'),
    
    body('dealId')
      .optional()
      .isMongoId()
      .withMessage('Invalid deal ID')
  ],

  addReaction: [
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID'),
    
    body('reaction')
      .isIn(['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'])
      .withMessage('Invalid reaction')
  ],

  deleteMessage: [
    param('messageId')
      .isMongoId()
      .withMessage('Invalid message ID')
  ],

  markAsRead: [
    param('conversationId')
      .isMongoId()
      .withMessage('Invalid conversation ID'),
    
    body('messageIds')
      .optional()
      .isArray()
      .withMessage('Message IDs must be an array')
  ],

  archiveConversation: [
    param('conversationId')
      .isMongoId()
      .withMessage('Invalid conversation ID')
  ],

  muteConversation: [
    param('conversationId')
      .isMongoId()
      .withMessage('Invalid conversation ID'),
    
    body('duration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive number')
  ],

  blockUser: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],

  unblockUser: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],

  searchMessages: [
    query('q')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query too long'),
    
    query('conversationId')
      .optional()
      .isMongoId()
      .withMessage('Invalid conversation ID'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

// ==================== REVIEW VALIDATIONS ====================
const reviewValidations = {
  create: [
    body('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    body('title')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    
    body('content')
      .notEmpty()
      .withMessage('Review content is required')
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
      .withMessage('Cannot have more than 5 cons'),
    
    body('criteria.communication')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Communication rating must be between 1 and 5'),
    
    body('criteria.quality')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Quality rating must be between 1 and 5'),
    
    body('criteria.timeliness')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Timeliness rating must be between 1 and 5'),
    
    body('criteria.professionalism')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Professionalism rating must be between 1 and 5'),
    
    body('criteria.value')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Value rating must be between 1 and 5')
  ],

  update: [
    param('reviewId')
      .isMongoId()
      .withMessage('Invalid review ID'),
    
    body('content')
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage('Review must be between 10 and 500 characters'),
    
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
  ],

  respond: [
    param('reviewId')
      .isMongoId()
      .withMessage('Invalid review ID'),
    
    body('response')
      .notEmpty()
      .withMessage('Response is required')
      .isLength({ max: 500 })
      .withMessage('Response cannot exceed 500 characters')
  ],

  report: [
    param('reviewId')
      .isMongoId()
      .withMessage('Invalid review ID'),
    
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ]
};

// ==================== DISPUTE VALIDATIONS ====================
const disputeValidations = {
  create: [
    body('dealId')
      .isMongoId()
      .withMessage('Invalid deal ID'),
    
    body('type')
      .isIn(['deliverables', 'payment', 'contract', 'communication', 'other'])
      .withMessage('Invalid dispute type'),
    
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    
    body('evidence')
      .optional()
      .isArray()
      .withMessage('Evidence must be an array')
      .custom(evidence => evidence.length <= 10)
      .withMessage('Cannot upload more than 10 evidence files'),
    
    body('evidence.*.url')
      .optional()
      .isURL()
      .withMessage('Please enter a valid URL for evidence'),
    
    body('evidence.*.description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Evidence description cannot exceed 500 characters')
  ],

  addMessage: [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters'),
    
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array'),
    
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean')
  ],

  updateStatus: [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    
    body('status')
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated'])
      .withMessage('Invalid status'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  resolve: [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    
    body('resolution.type')
      .isIn(['refund', 'partial_refund', 'complete_payment', 'rework', 'cancellation', 'other'])
      .withMessage('Invalid resolution type'),
    
    body('resolution.details')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Resolution details cannot exceed 500 characters'),
    
    body('resolution.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number')
  ]
};

// ==================== NOTIFICATION VALIDATIONS ====================
const notificationValidations = {
  markAsRead: [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  markAllAsRead: [],

  updateSettings: [
    body('email')
      .optional()
      .isObject()
      .withMessage('Email settings must be an object'),
    
    body('push')
      .optional()
      .isObject()
      .withMessage('Push settings must be an object'),
    
    body('sms')
      .optional()
      .isObject()
      .withMessage('SMS settings must be an object'),
    
    body('quiet_hours')
      .optional()
      .isObject()
      .withMessage('Quiet hours must be an object'),
    
    body('digest')
      .optional()
      .isObject()
      .withMessage('Digest settings must be an object')
  ],

  deleteNotification: [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],

  sendTest: [
    body('type')
      .optional()
      .isIn(['deal', 'message', 'payment', 'campaign', 'system'])
      .withMessage('Invalid notification type')
  ]
};

// ==================== SEARCH VALIDATIONS ====================
const searchValidations = {
  creators: [
    query('q')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query too long'),
    
    query('niche')
      .optional()
      .isString()
      .withMessage('Niche must be a string'),
    
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
      .withMessage('Min engagement must be between 0 and 100'),
    
    query('platform')
      .optional()
      .isIn(['instagram', 'youtube', 'tiktok', 'twitter'])
      .withMessage('Invalid platform'),
    
    query('location')
      .optional()
      .isString()
      .withMessage('Location must be a string'),
    
    query('verified')
      .optional()
      .isBoolean()
      .withMessage('Verified must be a boolean'),
    
    query('available')
      .optional()
      .isBoolean()
      .withMessage('Available must be a boolean'),
    
    query('sort')
      .optional()
      .isIn(['relevance', 'followers_desc', 'followers_asc', 'engagement_desc', 'engagement_asc', 'newest'])
      .withMessage('Invalid sort option'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  campaigns: [
    query('q')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query too long'),
    
    query('category')
      .optional()
      .isIn(['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'])
      .withMessage('Invalid category'),
    
    query('minBudget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min budget must be a positive number'),
    
    query('maxBudget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max budget must be a positive number'),
    
    query('platform')
      .optional()
      .isIn(['instagram', 'youtube', 'tiktok', 'twitter', 'facebook'])
      .withMessage('Invalid platform'),
    
    query('status')
      .optional()
      .isIn(['active', 'completed', 'draft'])
      .withMessage('Invalid status'),
    
    query('sort')
      .optional()
      .isIn(['newest', 'budget_desc', 'budget_asc', 'deadline_asc'])
      .withMessage('Invalid sort option'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  saveSearch: [
    body('name')
      .notEmpty()
      .withMessage('Search name is required')
      .isLength({ max: 50 })
      .withMessage('Search name cannot exceed 50 characters'),
    
    body('filters')
      .isObject()
      .withMessage('Filters must be an object')
  ],

  updateSavedSearch: [
    param('searchId')
      .isMongoId()
      .withMessage('Invalid search ID'),
    
    body('name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Search name cannot exceed 50 characters'),
    
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object')
  ],

  deleteSavedSearch: [
    param('searchId')
      .isMongoId()
      .withMessage('Invalid search ID')
  ]
};

// ==================== ADMIN VALIDATIONS ====================
const adminValidations = {
  updateUser: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid email'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'pending'])
      .withMessage('Invalid status'),
    
    body('isVerified')
      .optional()
      .isBoolean()
      .withMessage('isVerified must be a boolean'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('role')
      .optional()
      .isIn(['admin', 'moderator', 'support'])
      .withMessage('Invalid role')
  ],

  suspendUser: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters'),
    
    body('duration')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Duration must be between 1 and 365 days')
  ],

  approveItem: [
    param('type')
      .isIn(['user', 'campaign', 'creator', 'brand'])
      .withMessage('Invalid item type'),
    
    param('id')
      .isMongoId()
      .withMessage('Invalid item ID'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  rejectItem: [
    param('type')
      .isIn(['user', 'campaign', 'creator', 'brand'])
      .withMessage('Invalid item type'),
    
    param('id')
      .isMongoId()
      .withMessage('Invalid item ID'),
    
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters')
  ],

  refundPayment: [
    param('paymentId')
      .isMongoId()
      .withMessage('Invalid payment ID'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],

  updateSettings: [
    body('platformName')
      .optional()
      .isString()
      .withMessage('Platform name must be a string'),
    
    body('supportEmail')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid support email'),
    
    body('commissionRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Commission rate must be between 0 and 100'),
    
    body('minPayout')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum payout must be a positive number'),
    
    body('maxFileSize')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Max file size must be between 1 and 500 MB'),
    
    body('allowedFileTypes')
      .optional()
      .isArray()
      .withMessage('Allowed file types must be an array')
  ],

  generateReport: [
    body('reportType')
      .isIn(['users', 'campaigns', 'deals', 'payments', 'revenue', 'engagement'])
      .withMessage('Invalid report type'),
    
    body('dateRange.start')
      .isISO8601()
      .withMessage('Invalid start date'),
    
    body('dateRange.end')
      .isISO8601()
      .withMessage('Invalid end date')
      .custom((value, { req }) => new Date(value) >= new Date(req.body.dateRange.start))
      .withMessage('End date must be after start date'),
    
    body('format')
      .optional()
      .isIn(['pdf', 'csv', 'excel'])
      .withMessage('Invalid export format')
  ]
};

// ==================== COMMON VALIDATIONS ====================
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
      .toInt(),
    
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort must be a string'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc')
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
  ],

  fileUpload: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('File is required');
        }
        return true;
      })
  ],

  multipleFiles: [
    body('files')
      .custom((value, { req }) => {
        if (!req.files || req.files.length === 0) {
          throw new Error('At least one file is required');
        }
        if (req.files.length > 10) {
          throw new Error('Cannot upload more than 10 files');
        }
        return true;
      })
  ]
};

module.exports = {
  validate,
  authValidations,
  userValidations,
  brandValidations,
  creatorValidations,
  campaignValidations,
  dealValidations,
  deliverableValidations,
  paymentValidations,
  messageValidations,
  reviewValidations,
  disputeValidations,
  notificationValidations,
  searchValidations,
  adminValidations,
  commonValidations
};