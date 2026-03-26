const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Public routes
  getPlans,
  getPlanDetails,
  calculatePrice,
  
  // User routes
  getCurrentSubscription,
  subscribe,
  createCheckoutSession,
  createBillingPortalSession,
  createPlanChangeSession,
  cancelSubscription,
  changePlan,
  updatePaymentMethod,
  getSubscriptionHistory,
  checkLimits,
  reactivateSubscription,
  getInvoice,
  applyCoupon,
  getUpcomingInvoice,
  previewPlanChange,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getTaxInfo,
  updateTaxInfo,
  downloadInvoice,
  
  // Admin routes
  adminGetAllSubscriptions,
  adminGetSubscription,
  adminUpdateSubscription,
  adminCancelSubscription,
  adminGetStats,
  adminGetRevenue,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  adminGetAllPlans,
  adminGetPlan,
  adminGetCustomers,
  adminGetCustomer,
  adminRefundPayment,
  adminExportData
} = require('../controllers/subscriptionController');

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all available subscription plans
 * @access  Public
 * @query   {string} userType - Filter by user type (brand/creator)
 * @query   {string} interval - Filter by interval (month/year)
 */
router.get('/plans', getPlans);

/**
 * @route   GET /api/subscriptions/plans/:planId
 * @desc    Get single plan details
 * @access  Public
 */
router.get('/plans/:planId', getPlanDetails);

/**
 * @route   POST /api/subscriptions/calculate-price
 * @desc    Calculate subscription price
 * @access  Public
 * @body    {string} planId - Plan ID
 * @body    {string} interval - Interval (month/year)
 * @body    {string} couponCode - Coupon code (optional)
 */
router.post('/calculate-price', calculatePrice);

// ==================== PROTECTED USER ROUTES ====================
router.use(protect);

// ==================== CURRENT SUBSCRIPTION ====================

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current user subscription
 * @access  Private
 */
router.get('/current', getCurrentSubscription);

/**
 * @route   GET /api/subscriptions/limits
 * @desc    Check subscription limits
 * @access  Private
 */
router.get('/limits', checkLimits);

// ==================== SUBSCRIBE / CHANGE ====================

/**
 * @route   POST /api/subscriptions/subscribe
 * @desc    Subscribe to a plan
 * @access  Private
 * @body    {string} planId - Plan ID
 * @body    {string} paymentMethodId - Payment method ID
 * @body    {string} interval - Interval (month/year)
 * @body    {string} couponCode - Coupon code (optional)
 */
router.post('/subscribe', subscribe);

/**
 * @route   POST /api/subscriptions/checkout-session
 * @desc    Create Stripe Checkout session for subscription
 * @access  Private
 * @body    {string} planId - Plan ID
 * @body    {string} interval - Interval (month/year)
 */
router.post('/checkout-session', createCheckoutSession);

/**
 * @route   POST /api/subscriptions/billing-portal
 * @desc    Create Stripe Billing Portal session
 * @access  Private
 */
router.post('/billing-portal', createBillingPortalSession);

/**
 * @route   POST /api/subscriptions/plan-change-session
 * @desc    Create Stripe plan change confirmation session
 * @access  Private
 * @body    {string} planId - Plan ID
 * @body    {string} interval - Interval (month/year)
 */
router.post('/plan-change-session', createPlanChangeSession);

/**
 * @route   PUT /api/subscriptions/change
 * @desc    Change subscription plan
 * @access  Private
 * @body    {string} newPlanId - New plan ID
 * @body    {string} interval - New interval
 */
router.put('/change', changePlan);

/**
 * @route   POST /api/subscriptions/preview-change
 * @desc    Preview plan change (proration)
 * @access  Private
 * @body    {string} newPlanId - New plan ID
 * @body    {string} interval - New interval
 */
router.post('/preview-change', previewPlanChange);

// ==================== CANCEL / REACTIVATE ====================

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private
 * @body    {boolean} cancelAtPeriodEnd - Cancel at period end or immediately
 * @body    {string} reason - Cancellation reason
 * @body    {string} feedback - Cancellation feedback
 */
router.post('/cancel', cancelSubscription);

/**
 * @route   POST /api/subscriptions/reactivate
 * @desc    Reactivate cancelled subscription
 * @access  Private
 */
router.post('/reactivate', reactivateSubscription);

// ==================== PAYMENT METHODS ====================

/**
 * @route   GET /api/subscriptions/payment-methods
 * @desc    Get user's payment methods
 * @access  Private
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * @route   POST /api/subscriptions/payment-methods
 * @desc    Add new payment method
 * @access  Private
 * @body    {string} paymentMethodId - Payment method ID from Stripe
 * @body    {boolean} setDefault - Set as default
 */
router.post('/payment-methods', addPaymentMethod);

/**
 * @route   PUT /api/subscriptions/payment-methods/:methodId/default
 * @desc    Set default payment method
 * @access  Private
 */
router.put('/payment-methods/:methodId/default', setDefaultPaymentMethod);

/**
 * @route   DELETE /api/subscriptions/payment-methods/:methodId
 * @desc    Delete payment method
 * @access  Private
 */
router.delete('/payment-methods/:methodId', deletePaymentMethod);

/**
 * @route   POST /api/subscriptions/payment-method
 * @desc    Update default payment method (legacy)
 * @access  Private
 * @body    {string} paymentMethodId - Payment method ID
 */
router.post('/payment-method', updatePaymentMethod);

// ==================== INVOICES ====================

/**
 * @route   GET /api/subscriptions/history
 * @desc    Get subscription history
 * @access  Private
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/history', getSubscriptionHistory);

/**
 * @route   GET /api/subscriptions/invoices/:invoiceId
 * @desc    Get invoice by ID
 * @access  Private
 */
router.get('/invoices/:invoiceId', getInvoice);

/**
 * @route   GET /api/subscriptions/invoices/:invoiceId/download
 * @desc    Download invoice PDF
 * @access  Private
 */
router.get('/invoices/:invoiceId/download', downloadInvoice);

/**
 * @route   GET /api/subscriptions/upcoming-invoice
 * @desc    Get upcoming invoice
 * @access  Private
 */
router.get('/upcoming-invoice', getUpcomingInvoice);

// ==================== COUPONS & DISCOUNTS ====================

/**
 * @route   POST /api/subscriptions/apply-coupon
 * @desc    Apply coupon to subscription
 * @access  Private
 * @body    {string} couponCode - Coupon code
 */
router.post('/apply-coupon', applyCoupon);

// ==================== TAX INFORMATION ====================

/**
 * @route   GET /api/subscriptions/tax-info
 * @desc    Get tax information
 * @access  Private
 */
router.get('/tax-info', getTaxInfo);

/**
 * @route   PUT /api/subscriptions/tax-info
 * @desc    Update tax information
 * @access  Private
 * @body    {string} taxId - Tax ID
 * @body    {string} taxType - Tax type (vat/gst/sales_tax)
 * @body    {object} address - Billing address
 */
router.put('/tax-info', updateTaxInfo);

// ==================== ADMIN ROUTES ====================
router.use(authorize('admin'));

// ==================== SUBSCRIPTION MANAGEMENT ====================

/**
 * @route   GET /api/subscriptions/admin/all
 * @desc    Get all subscriptions (admin)
 * @access  Private/Admin
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} status - Filter by status
 * @query   {string} planId - Filter by plan
 * @query   {string} userId - Filter by user
 */
router.get('/admin/all', adminGetAllSubscriptions);

/**
 * @route   GET /api/subscriptions/admin/:subscriptionId
 * @desc    Get single subscription (admin)
 * @access  Private/Admin
 */
router.get('/admin/:subscriptionId', adminGetSubscription);

/**
 * @route   PUT /api/subscriptions/admin/:subscriptionId
 * @desc    Update subscription (admin)
 * @access  Private/Admin
 * @body    {string} status - New status
 * @body    {string} planId - New plan
 * @body    {object} metadata - Metadata updates
 */
router.put('/admin/:subscriptionId', adminUpdateSubscription);

/**
 * @route   POST /api/subscriptions/admin/:subscriptionId/cancel
 * @desc    Cancel subscription (admin)
 * @access  Private/Admin
 * @body    {string} reason - Cancellation reason
 * @body    {boolean} immediate - Cancel immediately
 */
router.post('/admin/:subscriptionId/cancel', adminCancelSubscription);

// ==================== PLAN MANAGEMENT ====================

/**
 * @route   GET /api/subscriptions/admin/plans/all
 * @desc    Get all plans (admin)
 * @access  Private/Admin
 */
router.get('/admin/plans/all', adminGetAllPlans);

/**
 * @route   GET /api/subscriptions/admin/plans/:planId
 * @desc    Get single plan (admin)
 * @access  Private/Admin
 */
router.get('/admin/plans/:planId', adminGetPlan);

/**
 * @route   POST /api/subscriptions/admin/plans
 * @desc    Create new plan (admin)
 * @access  Private/Admin
 * @body    {string} planId - Plan identifier
 * @body    {string} name - Plan name
 * @body    {string} description - Plan description
 * @body    {number} price - Plan price
 * @body    {string} currency - Currency
 * @body    {string} interval - Interval (month/year)
 * @body    {object} features - Plan features
 * @body    {object} limits - Plan limits
 */
router.post('/admin/plans', adminCreatePlan);

/**
 * @route   PUT /api/subscriptions/admin/plans/:planId
 * @desc    Update plan (admin)
 * @access  Private/Admin
 */
router.put('/admin/plans/:planId', adminUpdatePlan);

/**
 * @route   DELETE /api/subscriptions/admin/plans/:planId
 * @desc    Delete plan (admin)
 * @access  Private/Admin
 */
router.delete('/admin/plans/:planId', adminDeletePlan);

// ==================== CUSTOMER MANAGEMENT ====================

/**
 * @route   GET /api/subscriptions/admin/customers
 * @desc    Get all customers (admin)
 * @access  Private/Admin
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/admin/customers', adminGetCustomers);

/**
 * @route   GET /api/subscriptions/admin/customers/:userId
 * @desc    Get single customer (admin)
 * @access  Private/Admin
 */
router.get('/admin/customers/:userId', adminGetCustomer);

// ==================== PAYMENT OPERATIONS ====================

/**
 * @route   POST /api/subscriptions/admin/refund/:paymentId
 * @desc    Refund payment (admin)
 * @access  Private/Admin
 * @body    {number} amount - Amount to refund
 * @body    {string} reason - Refund reason
 */
router.post('/admin/refund/:paymentId', adminRefundPayment);

// ==================== STATISTICS & REPORTS ====================

/**
 * @route   GET /api/subscriptions/admin/stats
 * @desc    Get subscription statistics (admin)
 * @access  Private/Admin
 */
router.get('/admin/stats', adminGetStats);

/**
 * @route   GET /api/subscriptions/admin/revenue
 * @desc    Get revenue analytics (admin)
 * @access  Private/Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} groupBy - Group by (day/week/month)
 */
router.get('/admin/revenue', adminGetRevenue);

/**
 * @route   GET /api/subscriptions/admin/export
 * @desc    Export subscription data (admin)
 * @access  Private/Admin
 * @query   {string} format - Export format (csv/excel)
 * @query   {string} dateRange - Date range
 */
router.get('/admin/export', adminExportData);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Subscription service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;