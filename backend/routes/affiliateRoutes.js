// routes/affiliateRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const affiliateController = require('../controllers/affiliateController');
const rateLimit = require('express-rate-limit');

// Rate limiting for affiliate endpoints
const affiliateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});

// Validation rules
const validateCreateLink = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('commission_structure')
    .optional()
    .isObject()
    .withMessage('Commission structure must be an object')
];

const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 50, max: 100000 })
    .withMessage('Amount must be between $50 and $100,000'),
  body('payment_method')
    .isIn(['paypal', 'bank_account', 'stripe'])
    .withMessage('Invalid payment method')
];

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/affiliate/terms
 * @desc    Get affiliate program terms
 * @access  Public
 */
router.get('/terms', affiliateController.getTerms);

/**
 * @route   GET /api/affiliate/leaderboard
 * @desc    Get top affiliates leaderboard
 * @access  Public
 */
router.get('/leaderboard', affiliateController.getLeaderboard);

/**
 * @route   GET /api/affiliate/track/:code
 * @desc    Track referral click
 * @access  Public
 */
router.get('/track/:code', affiliateController.trackReferralClick);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

/**
 * @route   POST /api/affiliate/create-link
 * @desc    Create referral link
 * @access  Private
 */
router.post(
  '/create-link',
  affiliateLimiter,
  validateCreateLink,
  affiliateController.createReferralLink
);

/**
 * @route   GET /api/affiliate/stats
 * @desc    Get referral stats
 * @access  Private
 */
router.get('/stats', affiliateController.getReferralStats);

/**
 * @route   GET /api/affiliate/commissions
 * @desc    Get commission history
 * @access  Private
 * @query   {string} status - Filter by status (pending/paid/cancelled)
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get(
  '/commissions',
  [
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  affiliateController.getCommissions
);

/**
 * @route   GET /api/affiliate/referrals
 * @desc    Get all referrals
 * @access  Private
 */
router.get('/referrals', affiliateController.getReferrals);

/**
 * @route   GET /api/affiliate/referrals/:referralId
 * @desc    Get single referral details
 * @access  Private
 */
router.get(
  '/referrals/:referralId',
  [
    param('referralId')
      .isMongoId()
      .withMessage('Invalid referral ID')
  ],
  affiliateController.getReferralDetails
);

/**
 * @route   POST /api/affiliate/withdraw
 * @desc    Request withdrawal of earnings
 * @access  Private
 */
router.post(
  '/withdraw',
  affiliateLimiter,
  validateWithdrawal,
  affiliateController.withdrawEarnings
);

/**
 * @route   GET /api/affiliate/withdrawals
 * @desc    Get withdrawal history
 * @access  Private
 */
router.get('/withdrawals', affiliateController.getWithdrawals);

/**
 * @route   POST /api/affiliate/payout-methods
 * @desc    Add payout method
 * @access  Private
 */
router.post(
  '/payout-methods',
  [
    body('type')
      .isIn(['paypal', 'bank_account', 'stripe'])
      .withMessage('Invalid payout method type'),
    body('details')
      .isObject()
      .withMessage('Details are required')
  ],
  affiliateController.addPayoutMethod
);

/**
 * @route   GET /api/affiliate/payout-methods
 * @desc    Get payout methods
 * @access  Private
 */
router.get('/payout-methods', affiliateController.getPayoutMethods);

/**
 * @route   DELETE /api/affiliate/payout-methods/:methodId
 * @desc    Delete payout method
 * @access  Private
 */
router.delete(
  '/payout-methods/:methodId',
  [
    param('methodId')
      .isMongoId()
      .withMessage('Invalid method ID')
  ],
  affiliateController.deletePayoutMethod
);

/**
 * @route   POST /api/affiliate/payout-methods/:methodId/default
 * @desc    Set default payout method
 * @access  Private
 */
router.post(
  '/payout-methods/:methodId/default',
  [
    param('methodId')
      .isMongoId()
      .withMessage('Invalid method ID')
  ],
  affiliateController.setDefaultPayoutMethod
);

// ==================== ADMIN ROUTES ====================
router.use(authorize('admin'));

/**
 * @route   GET /api/affiliate/admin/all
 * @desc    Get all referrals (admin)
 * @access  Private/Admin
 */
router.get(
  '/admin/all',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
    query('status')
      .optional()
      .isIn(['pending', 'active', 'paid', 'cancelled', 'fraud'])
      .withMessage('Invalid status')
  ],
  affiliateController.adminGetAllReferrals
);

/**
 * @route   GET /api/affiliate/admin/stats
 * @desc    Get affiliate program stats (admin)
 * @access  Private/Admin
 */
router.get('/admin/stats', affiliateController.adminGetStats);

/**
 * @route   POST /api/affiliate/admin/commissions/:commissionId/approve
 * @desc    Approve commission (admin)
 * @access  Private/Admin
 */
router.post(
  '/admin/commissions/:commissionId/approve',
  [
    param('commissionId')
      .isMongoId()
      .withMessage('Invalid commission ID'),
    body('transaction_id')
      .optional()
      .isString()
      .trim()
  ],
  affiliateController.adminApproveCommission
);

/**
 * @route   POST /api/affiliate/admin/commissions/:commissionId/reject
 * @desc    Reject commission (admin)
 * @access  Private/Admin
 */
router.post(
  '/admin/commissions/:commissionId/reject',
  [
    param('commissionId')
      .isMongoId()
      .withMessage('Invalid commission ID'),
    body('reason')
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  affiliateController.adminRejectCommission
);

/**
 * @route   POST /api/affiliate/admin/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (admin)
 * @access  Private/Admin
 */
router.post(
  '/admin/withdrawals/:withdrawalId/process',
  [
    param('withdrawalId')
      .isMongoId()
      .withMessage('Invalid withdrawal ID'),
    body('status')
      .isIn(['approved', 'rejected', 'processed'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
  ],
  affiliateController.adminProcessWithdrawal
);

/**
 * @route   GET /api/affiliate/admin/payouts/pending
 * @desc    Get pending payouts (admin)
 * @access  Private/Admin
 */
router.get('/admin/payouts/pending', affiliateController.adminGetPendingPayouts);

/**
 * @route   POST /api/affiliate/admin/settings
 * @desc    Update affiliate program settings (admin)
 * @access  Private/Admin (Super Admin only)
 */
router.post(
  '/admin/settings',
  authorize('super_admin'),
  [
    body('commission_rates')
      .optional()
      .isObject()
      .withMessage('Commission rates must be an object'),
    body('minimum_payout')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Minimum payout must be at least 1'),
    body('cookie_duration')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Cookie duration must be between 1 and 365 days')
  ],
  affiliateController.adminUpdateSettings
);

/**
 * @route   GET /api/affiliate/admin/export
 * @desc    Export affiliate data (admin)
 * @access  Private/Admin
 */
router.get(
  '/admin/export',
  [
    query('format')
      .optional()
      .isIn(['csv', 'excel', 'json'])
      .withMessage('Invalid format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date')
  ],
  affiliateController.adminExportData
);

// ==================== WEBHOOK (Public) ====================

/**
 * @route   POST /api/affiliate/webhook/signup
 * @desc    Webhook for signup tracking
 * @access  Public
 */
router.post('/webhook/signup', affiliateController.signupWebhook);

module.exports = router;