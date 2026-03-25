const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createFeaturedListing,
  getFeaturedListings,
  getListingsByPlacement,
  getMyListings,
  getFeaturedListing,
  updateFeaturedListing,
  cancelFeaturedListing,
  extendFeaturedListing,
  confirmExtension,
  trackImpression,
  trackClick,
  trackConversion,
  getPerformanceStats,
  calculatePrice,
  getPackages,
  getAvailability,
  getRecommendations,
  adminGetAllListings,
  adminApproveListing,
  adminRejectListing,
  adminGetStats,
  adminUpdatePriority,
  adminBulkAction
} = require('../controllers/featuredController');

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/featured
 * @desc    Get all active featured listings
 * @access  Public
 * @query   {string} type - Filter by type (campaign/creator/brand)
 * @query   {string} placement - Filter by placement
 * @query   {string} category - Filter by category
 * @query   {number} limit - Number of listings to return
 * @query   {number} page - Page number
 */
router.get('/', getFeaturedListings);

/**
 * @route   GET /api/featured/placement/:placement
 * @desc    Get featured listings by placement
 * @access  Public
 * @param   {string} placement - Placement type (homepage/search_top/category_top)
 * @query   {string} category - Category filter
 * @query   {number} limit - Number of listings to return
 */
router.get('/placement/:placement', getListingsByPlacement);

/**
 * @route   GET /api/featured/packages
 * @desc    Get available featured packages
 * @access  Public
 */
router.get('/packages', getPackages);

/**
 * @route   POST /api/featured/calculate-price
 * @desc    Calculate price for featured listing
 * @access  Public
 * @body    {string} package - Package name
 * @body    {number} days - Duration in days
 * @body    {object} options - Additional options (placement, priority)
 */
router.post('/calculate-price', calculatePrice);

/**
 * @route   GET /api/featured/availability
 * @desc    Check availability for dates
 * @access  Public
 * @query   {string} placement - Placement type
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} category - Category (optional)
 */
router.get('/availability', getAvailability);

// ==================== TRACKING ROUTES (NO AUTH REQUIRED) ====================

/**
 * @route   POST /api/featured/:id/track/impression
 * @desc    Track impression for featured listing
 * @access  Public
 */
router.post('/:id/track/impression', trackImpression);

/**
 * @route   POST /api/featured/:id/track/click
 * @desc    Track click for featured listing
 * @access  Public
 */
router.post('/:id/track/click', trackClick);

/**
 * @route   POST /api/featured/:id/track/conversion
 * @desc    Track conversion for featured listing
 * @access  Public
 * @body    {number} value - Conversion value (optional)
 */
router.post('/:id/track/conversion', trackConversion);

// ==================== PROTECTED USER ROUTES ====================
router.use(protect);

/**
 * @route   POST /api/featured
 * @desc    Create a new featured listing
 * @access  Private
 * @body    {string} targetType - Type (campaign/creator/brand)
 * @body    {string} targetId - ID of target
 * @body    {object} placement - Placement details
 * @body    {object} package - Package details
 * @body    {string} startDate - Start date
 * @body    {string} endDate - End date
 * @body    {object} targeting - Target audience filters
 * @body    {object} display - Display settings
 */
router.post('/', createFeaturedListing);

/**
 * @route   GET /api/featured/my-listings
 * @desc    Get current user's featured listings
 * @access  Private
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} status - Filter by status
 */
router.get('/my-listings', getMyListings);

/**
 * @route   GET /api/featured/:id
 * @desc    Get single featured listing by ID
 * @access  Private
 */
router.get('/:id', getFeaturedListing);

/**
 * @route   PUT /api/featured/:id
 * @desc    Update featured listing
 * @access  Private
 * @body    {object} display - Display settings to update
 * @body    {object} targeting - Targeting settings to update
 * @body    {object} placement - Placement settings to update
 */
router.put('/:id', updateFeaturedListing);

/**
 * @route   POST /api/featured/:id/cancel
 * @desc    Cancel featured listing
 * @access  Private
 * @body    {string} reason - Cancellation reason
 */
router.post('/:id/cancel', cancelFeaturedListing);

/**
 * @route   POST /api/featured/:id/extend
 * @desc    Extend featured listing duration
 * @access  Private
 * @body    {number} days - Days to extend
 */
router.post('/:id/extend', extendFeaturedListing);

/**
 * @route   POST /api/featured/:id/confirm-extension
 * @desc    Confirm extension payment
 * @access  Private
 * @body    {number} days - Days extended
 * @body    {string} paymentIntentId - Stripe payment intent ID
 */
router.post('/:id/confirm-extension', confirmExtension);

/**
 * @route   GET /api/featured/:id/performance
 * @desc    Get performance stats for listing
 * @access  Private
 */
router.get('/:id/performance', getPerformanceStats);

/**
 * @route   GET /api/featured/recommendations
 * @desc    Get recommendations for user
 * @access  Private
 */
router.get('/recommendations', getRecommendations);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/featured/admin/all
 * @desc    Get all featured listings (admin)
 * @access  Private/Admin
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} status - Filter by status
 * @query   {string} type - Filter by target type
 */
router.get('/admin/all', authorize('admin'), adminGetAllListings);

/**
 * @route   GET /api/featured/admin/stats
 * @desc    Get featured listings stats (admin)
 * @access  Private/Admin
 */
router.get('/admin/stats', authorize('admin'), adminGetStats);

/**
 * @route   POST /api/featured/admin/:id/approve
 * @desc    Approve featured listing (admin)
 * @access  Private/Admin
 * @body    {string} notes - Approval notes
 */
router.post('/admin/:id/approve', authorize('admin'), adminApproveListing);

/**
 * @route   POST /api/featured/admin/:id/reject
 * @desc    Reject featured listing (admin)
 * @access  Private/Admin
 * @body    {string} reason - Rejection reason
 */
router.post('/admin/:id/reject', authorize('admin'), adminRejectListing);

/**
 * @route   PUT /api/featured/admin/:id/priority
 * @desc    Update listing priority (admin)
 * @access  Private/Admin
 * @body    {number} priority - New priority (1-10)
 */
router.put('/admin/:id/priority', authorize('admin'), adminUpdatePriority);

/**
 * @route   POST /api/featured/admin/bulk
 * @desc    Bulk action on listings (admin)
 * @access  Private/Admin
 * @body    {string[]} listingIds - Array of listing IDs
 * @body    {string} action - Action to perform
 * @body    {object} data - Additional data for action
 */
router.post('/admin/bulk', authorize('admin'), adminBulkAction);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Featured listings service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;