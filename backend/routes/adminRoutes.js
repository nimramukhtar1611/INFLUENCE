// routes/adminRoutes.js - UPDATED WITH 2FA ENDPOINTS
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllDisputes,
  assignDispute,
  resolveDispute,
  getPendingWithdrawals,
  approveWithdrawal,
  getPlatformAnalytics,
  updateSettings,
  getActivityLog,
  // 2FA endpoints
  adminGenerate2FA,
  adminVerify2FA,
  adminDisable2FA,
  adminRegenerateBackupCodes,
  adminGet2FAStatus
} = require('../controllers/admin/adminController');
const { protect, adminProtect, superAdminProtect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const adminCampaignRoutes = require('./campaignRoutes');
const adminUserRoutes = require('./userRoutes');
const adminReportRoutes = require('./reportRoutes');

// Rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// 2FA rate limiter
const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many 2FA attempts. Please try again later.'
  }
});

// Validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('two_factor_code')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must be numeric')
];

const validate2FAToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be 6 digits')
    .isNumeric()
    .withMessage('Token must be numeric')
];

// Public routes (no auth required)
router.post(
  '/login',
  adminLimiter,
  validateLogin,
  adminLogin
);

// ==================== 2FA MANAGEMENT ROUTES ====================
// All routes below require admin authentication
router.use(adminProtect);

/**
 * @route   POST /api/admin/2fa/generate
 * @desc    Generate 2FA secret for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/generate',
  twoFALimiter,
  adminGenerate2FA
);
/**
 * @route   POST /api/admin/2fa/verify
 * @desc    Verify and enable 2FA for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/verify',
  twoFALimiter,
  validate2FAToken,
  adminVerify2FA
);

/**
 * @route   POST /api/admin/2fa/disable
 * @desc    Disable 2FA for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/disable',
  twoFALimiter,
  validate2FAToken,
  adminDisable2FA
);

/**
 * @route   POST /api/admin/2fa/regenerate-codes
 * @desc    Regenerate backup codes
 * @access  Private/Admin
 */
router.post(
  '/2fa/regenerate-codes',
  twoFALimiter,
  validate2FAToken,
  adminRegenerateBackupCodes
);

/**
 * @route   GET /api/admin/2fa/status
 * @desc    Get 2FA status
 * @access  Private/Admin
 */
router.get(
  '/2fa/status',
  adminGet2FAStatus
);

// ==================== DASHBOARD ====================
router.get(
  '/dashboard',
  getDashboardStats
);

// ==================== USER MANAGEMENT ====================
router.get(
  '/users',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('user_type')
      .optional()
      .isIn(['brand', 'creator', 'agency'])
      .withMessage('Invalid user type'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'blocked', 'pending'])
      .withMessage('Invalid status'),
    query('verified')
      .optional()
      .isBoolean()
      .withMessage('Verified must be true or false'),
    query('sort_by')
      .optional()
      .isIn(['created_at', 'full_name', 'email', 'last_active'])
      .withMessage('Invalid sort field'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  getAllUsers
);

router.get(
  '/users/:userId',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  getUserDetails
);

router.put(
  '/users/:userId/status',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('action')
      .isIn(['verify', 'unverify', 'block', 'unblock'])
      .withMessage('Invalid action'),
    body('reason')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  updateUserStatus
);

// ==================== DISPUTE MANAGEMENT ====================
router.get(
  '/disputes',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['open', 'investigating', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('type')
      .optional()
      .isIn(['payment', 'delivery', 'quality', 'communication', 'contract_breach'])
      .withMessage('Invalid dispute type')
  ],
  getAllDisputes
);

router.post(
  '/disputes/:disputeId/assign',
  [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    body('admin_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  assignDispute
);

router.post(
  '/disputes/:disputeId/resolve',
  [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    body('type')
      .isIn(['refund_brand', 'release_payment', 'split_funds', 'cancel_contract', 'no_action'])
      .withMessage('Invalid resolution type'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number'),
    body('details')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Details cannot exceed 1000 characters')
  ],
  resolveDispute
);

// ==================== WITHDRAWAL MANAGEMENT ====================
router.get(
  '/withdrawals/pending',
  getPendingWithdrawals
);

router.post(
  '/withdrawals/:withdrawalId/approve',
  [
    param('withdrawalId')
      .isMongoId()
      .withMessage('Invalid withdrawal ID'),
    body('transaction_id')
      .notEmpty()
      .withMessage('Transaction ID is required')
      .isString()
      .trim(),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  approveWithdrawal
);

// ==================== ANALYTICS ====================
router.get(
  '/analytics',
  [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('group_by')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Group by must be day, week, or month')
  ],
  getPlatformAnalytics
);

// ==================== SETTINGS (Super Admin only) ====================
router.put(
  '/settings',
  superAdminProtect,
  updateSettings
);

// ==================== ACTIVITY LOG (Super Admin only) ====================
router.get(
  '/activity-log',
  superAdminProtect,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
    query('admin_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  getActivityLog
);

// ==================== MOUNT SUB-ROUTES ====================
router.use('/campaigns', adminCampaignRoutes);
router.use('/users', adminUserRoutes);
router.use('/reports', adminReportRoutes);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString(),
    features: {
      twoFactorAuth: true
    }
  });
});

module.exports = router;