const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardAnalytics,
  getUserAnalytics,
  getCampaignAnalytics,
  getDealAnalytics,
  getPaymentAnalytics,
  getEngagementAnalytics,
  getCreatorAnalytics,
  getBrandAnalytics,
  getPlatformHealth,
  getROIAnalytics,
  getExportFormats,
  createReport,
  getReports,
  getReport,
  exportReport,
  deleteReport,
  scheduleReport,
  unscheduleReport,
  getPerformanceMetrics,
  getGrowthMetrics,
  getDemographics
} = require('../controllers/analyticsController');

// ==================== ALL ROUTES ARE PROTECTED AND ADMIN ONLY ====================
router.use(protect, authorize('admin'));

// ==================== DASHBOARD ANALYTICS ====================
/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get main dashboard analytics
 * @access  Admin
 */
router.get('/dashboard', getDashboardAnalytics);

// ==================== USER ANALYTICS ====================
/**
 * @route   GET /api/analytics/users
 * @desc    Get user analytics and growth metrics
 * @access  Admin
 * @query   {string} startDate - Start date for filtering
 * @query   {string} endDate - End date for filtering
 * @query   {string} groupBy - Group by (day/week/month)
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/users', getUserAnalytics);

/**
 * @route   GET /api/analytics/users/demographics
 * @desc    Get user demographics
 * @access  Admin
 */
router.get('/users/demographics', getDemographics);

/**
 * @route   GET /api/analytics/users/growth
 * @desc    Get user growth metrics
 * @access  Admin
 */
router.get('/users/growth', getGrowthMetrics);

// ==================== CAMPAIGN ANALYTICS ====================
/**
 * @route   GET /api/analytics/campaigns
 * @desc    Get campaign performance analytics
 * @access  Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} groupBy - Group by (day/week/month)
 * @query   {string} category - Filter by category
 * @query   {string} status - Filter by status
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/campaigns', getCampaignAnalytics);

// ==================== DEAL ANALYTICS ====================
/**
 * @route   GET /api/analytics/deals
 * @desc    Get deal analytics and performance
 * @access  Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} groupBy - Group by (day/week/month)
 * @query   {string} status - Filter by status
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/deals', getDealAnalytics);

// ==================== FINANCIAL ANALYTICS ====================
/**
 * @route   GET /api/analytics/financial
 * @desc    Get financial analytics and revenue
 * @access  Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} groupBy - Group by (day/week/month)
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/financial', getPaymentAnalytics);

// ==================== ENGAGEMENT ANALYTICS ====================
/**
 * @route   GET /api/analytics/engagement
 * @desc    Get engagement metrics across platform
 * @access  Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/engagement', getEngagementAnalytics);

// ==================== CREATOR PERFORMANCE ====================
/**
 * @route   GET /api/analytics/creators
 * @desc    Get creator performance analytics
 * @access  Admin
 * @query   {string} limit - Number of creators to return
 * @query   {string} sortBy - Sort by (earnings/deals/followers)
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/creators', getCreatorAnalytics);

// ==================== BRAND PERFORMANCE ====================
/**
 * @route   GET /api/analytics/brands
 * @desc    Get brand performance analytics
 * @access  Admin
 * @query   {string} limit - Number of brands to return
 * @query   {string} sortBy - Sort by (spent/deals/campaigns)
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/brands', getBrandAnalytics);

// ==================== PLATFORM HEALTH ====================
/**
 * @route   GET /api/analytics/health
 * @desc    Get platform health metrics
 * @access  Admin
 */
router.get('/health', getPlatformHealth);

// ==================== ROI ANALYTICS ====================
/**
 * @route   GET /api/analytics/roi
 * @desc    Get ROI analytics
 * @access  Admin
 * @query   {string} period - Time period (7d/30d/90d/12m)
 * @query   {string} campaignId - Filter by campaign
 * @query   {string} brandId - Filter by brand
 */
router.get('/roi', getROIAnalytics);

// ==================== PERFORMANCE METRICS ====================
/**
 * @route   GET /api/analytics/performance
 * @desc    Get key performance metrics
 * @access  Admin
 */
router.get('/performance', getPerformanceMetrics);

// ==================== GROWTH METRICS ====================
/**
 * @route   GET /api/analytics/growth
 * @desc    Get growth metrics
 * @access  Admin
 */
router.get('/growth', getGrowthMetrics);

// ==================== EXPORT FORMATS ====================
/**
 * @route   GET /api/analytics/export-formats
 * @desc    Get available export formats
 * @access  Admin
 */
router.get('/export-formats', getExportFormats);

// ==================== REPORT MANAGEMENT ====================

/**
 * @route   POST /api/analytics/reports
 * @desc    Create a new report
 * @access  Admin
 * @body    {string} type - Report type
 * @body    {string} name - Report name
 * @body    {string} description - Report description
 * @body    {object} dateRange - Date range for report
 * @body    {object} filters - Report filters
 * @body    {string[]} metrics - Metrics to include
 * @body    {string} groupBy - Group by field
 * @body    {object} exportFormats - Export format preferences
 */
router.post('/reports', createReport);

/**
 * @route   GET /api/analytics/reports
 * @desc    Get all reports
 * @access  Admin
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} type - Filter by report type
 */
router.get('/reports', getReports);

/**
 * @route   GET /api/analytics/reports/:reportId
 * @desc    Get single report by ID
 * @access  Admin
 */
router.get('/reports/:reportId', getReport);

/**
 * @route   GET /api/analytics/reports/:reportId/export
 * @desc    Export report in specified format
 * @access  Admin
 * @query   {string} format - Export format (pdf/csv/excel/json)
 */
router.get('/reports/:reportId/export', exportReport);

/**
 * @route   DELETE /api/analytics/reports/:reportId
 * @desc    Delete a report
 * @access  Admin
 */
router.delete('/reports/:reportId', deleteReport);

/**
 * @route   POST /api/analytics/reports/:reportId/schedule
 * @desc    Schedule a report for regular delivery
 * @access  Admin
 * @body    {string} frequency - Frequency (daily/weekly/monthly)
 * @body    {string[]} recipients - Email recipients
 */
router.post('/reports/:reportId/schedule', scheduleReport);

/**
 * @route   POST /api/analytics/reports/:reportId/unschedule
 * @desc    Unschedule a report
 * @access  Admin
 */
router.post('/reports/:reportId/unschedule', unscheduleReport);

// ==================== TIME SERIES ANALYTICS ====================

/**
 * @route   GET /api/analytics/timeseries/users
 * @desc    Get user time series data
 * @access  Admin
 */
router.get('/timeseries/users', getUserAnalytics);

/**
 * @route   GET /api/analytics/timeseries/revenue
 * @desc    Get revenue time series data
 * @access  Admin
 */
router.get('/timeseries/revenue', getPaymentAnalytics);

/**
 * @route   GET /api/analytics/timeseries/engagement
 * @desc    Get engagement time series data
 * @access  Admin
 */
router.get('/timeseries/engagement', getEngagementAnalytics);

// ==================== COMPARISON ANALYTICS ====================

/**
 * @route   GET /api/analytics/comparison/periods
 * @desc    Compare metrics across periods
 * @access  Admin
 * @query   {string} currentPeriod - Current period
 * @query   {string} previousPeriod - Previous period
 * @query   {string} metrics - Metrics to compare
 */
router.get('/comparison/periods', getGrowthMetrics);

/**
 * @route   GET /api/analytics/comparison/categories
 * @desc    Compare performance across categories
 * @access  Admin
 */
router.get('/comparison/categories', getCampaignAnalytics);

// ==================== HEALTH CHECK ====================
/**
 * @route   GET /api/analytics/health-check
 * @desc    Check if analytics service is running
 * @access  Admin
 */
router.get('/health-check', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;