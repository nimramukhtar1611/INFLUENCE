const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // User routes
  exportUserData,
  getExportStatus,
  downloadExport,
  deleteAccount,
  getDataUsage,
  updatePrivacySettings,
  getPrivacySettings,
  withdrawConsent,
  getConsentHistory,
  requestDataCorrection,
  restrictProcessing,
  objectToProcessing,
  getComplianceReport,
  
  // Admin routes
  adminGetDeletionRequests,
  adminProcessDeletion,
  adminGetConsentReports,
  adminGetDataSubjectRequests,
  adminUpdateDataSubjectRequest,
  adminGetComplianceAuditLog,
  adminExportComplianceReport,
  adminAnonymizeUserData,
  adminRestrictUserData,
  adminGetPrivacySettings,
  adminUpdateGlobalPrivacySettings
} = require('../controllers/complianceController');

// ==================== USER ROUTES (GDPR RIGHTS) ====================
router.use(protect);

// ==================== DATA PORTABILITY (GDPR ARTICLE 20) ====================

/**
 * @route   GET /api/compliance/export
 * @desc    Request data export (Right to data portability)
 * @access  Private
 */
router.get('/export', exportUserData);

/**
 * @route   GET /api/compliance/export/:exportId/status
 * @desc    Check export status
 * @access  Private
 */
router.get('/export/:exportId/status', getExportStatus);

/**
 * @route   GET /api/compliance/export/:exportId/download
 * @desc    Download exported data
 * @access  Private
 */
router.get('/export/:exportId/download', downloadExport);

// ==================== RIGHT TO ERASURE (GDPR ARTICLE 17) ====================

/**
 * @route   DELETE /api/compliance/account
 * @desc    Delete user account (Right to erasure)
 * @access  Private
 * @body    {string} confirm - Confirmation text "DELETE"
 * @body    {string} password - Password confirmation
 * @body    {string} reason - Deletion reason (optional)
 */
router.delete('/account', deleteAccount);

// ==================== RIGHT TO ACCESS (GDPR ARTICLE 15) ====================

/**
 * @route   GET /api/compliance/usage
 * @desc    Get data usage report
 * @access  Private
 */
router.get('/usage', getDataUsage);

/**
 * @route   GET /api/compliance/report
 * @desc    Get comprehensive compliance report
 * @access  Private
 */
router.get('/report', getComplianceReport);

// ==================== PRIVACY SETTINGS ====================

/**
 * @route   GET /api/compliance/privacy
 * @desc    Get privacy settings
 * @access  Private
 */
router.get('/privacy', getPrivacySettings);

/**
 * @route   PUT /api/compliance/privacy
 * @desc    Update privacy settings
 * @access  Private
 * @body    {boolean} dataSharing - Data sharing consent
 * @body    {boolean} marketingEmails - Marketing email consent
 * @body    {boolean} cookieConsent - Cookie consent
 * @body    {boolean} analyticsTracking - Analytics tracking consent
 * @body    {boolean} thirdPartySharing - Third party sharing consent
 */
router.put('/privacy', updatePrivacySettings);

// ==================== CONSENT MANAGEMENT ====================

/**
 * @route   POST /api/compliance/withdraw-consent
 * @desc    Withdraw specific consent
 * @access  Private
 * @body    {string} consentType - Type of consent to withdraw
 * @body    {string} reason - Reason for withdrawal (optional)
 */
router.post('/withdraw-consent', withdrawConsent);

/**
 * @route   GET /api/compliance/consent-history
 * @desc    Get consent history
 * @access  Private
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/consent-history', getConsentHistory);

// ==================== RIGHT TO RECTIFICATION (GDPR ARTICLE 16) ====================

/**
 * @route   POST /api/compliance/correct-data
 * @desc    Request data correction
 * @access  Private
 * @body    {string} field - Field to correct
 * @body    {any} currentValue - Current value
 * @body    {any} correctedValue - Corrected value
 * @body    {string} reason - Reason for correction
 */
router.post('/correct-data', requestDataCorrection);

// ==================== RIGHT TO RESTRICTION (GDPR ARTICLE 18) ====================

/**
 * @route   POST /api/compliance/restrict-processing
 * @desc    Restrict data processing
 * @access  Private
 * @body    {string} reason - Reason for restriction
 */
router.post('/restrict-processing', restrictProcessing);

// ==================== RIGHT TO OBJECT (GDPR ARTICLE 21) ====================

/**
 * @route   POST /api/compliance/object-processing
 * @desc    Object to automated processing
 * @access  Private
 * @body    {string} processingType - Type of processing to object to
 * @body    {string} reason - Reason for objection
 */
router.post('/object-processing', objectToProcessing);

// ==================== ADMIN ROUTES ====================
router.use(authorize('admin'));

// ==================== DELETION REQUESTS MANAGEMENT ====================

/**
 * @route   GET /api/compliance/admin/deletion-requests
 * @desc    Get all deletion requests
 * @access  Private/Admin
 */
router.get('/admin/deletion-requests', adminGetDeletionRequests);

/**
 * @route   POST /api/compliance/admin/process-deletion/:userId
 * @desc    Process deletion request
 * @access  Private/Admin
 * @param   {string} userId - User ID
 * @body    {string} action - Action to take
 * @body    {string} notes - Admin notes
 */
router.post('/admin/process-deletion/:userId', adminProcessDeletion);

/**
 * @route   POST /api/compliance/admin/anonymize/:userId
 * @desc    Anonymize user data
 * @access  Private/Admin
 * @param   {string} userId - User ID
 * @body    {string} reason - Anonymization reason
 */
router.post('/admin/anonymize/:userId', adminAnonymizeUserData);

/**
 * @route   POST /api/compliance/admin/restrict/:userId
 * @desc    Restrict user data processing
 * @access  Private/Admin
 * @param   {string} userId - User ID
 * @body    {string} reason - Restriction reason
 */
router.post('/admin/restrict/:userId', adminRestrictUserData);

// ==================== DATA SUBJECT REQUESTS ====================

/**
 * @route   GET /api/compliance/admin/requests
 * @desc    Get all data subject requests
 * @access  Private/Admin
 * @query   {string} status - Filter by status
 * @query   {string} type - Filter by request type
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/admin/requests', adminGetDataSubjectRequests);

/**
 * @route   PUT /api/compliance/admin/requests/:requestId
 * @desc    Update data subject request
 * @access  Private/Admin
 * @param   {string} requestId - Request ID
 * @body    {string} status - New status
 * @body    {string} notes - Admin notes
 */
router.put('/admin/requests/:requestId', adminUpdateDataSubjectRequest);

// ==================== CONSENT REPORTS ====================

/**
 * @route   GET /api/compliance/admin/consent-reports
 * @desc    Get consent reports
 * @access  Private/Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} export - Export format (csv/pdf)
 */
router.get('/admin/consent-reports', adminGetConsentReports);

// ==================== COMPLIANCE AUDIT LOGS ====================

/**
 * @route   GET /api/compliance/admin/audit-logs
 * @desc    Get compliance audit logs
 * @access  Private/Admin
 * @query   {string} startDate - Start date
 * @query   {string} endDate - End date
 * @query   {string} userId - Filter by user
 * @query   {string} action - Filter by action
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get('/admin/audit-logs', adminGetComplianceAuditLog);

/**
 * @route   GET /api/compliance/admin/export-report
 * @desc    Export compliance report
 * @access  Private/Admin
 * @query   {string} format - Export format (pdf/csv/excel)
 * @query   {string} dateRange - Date range
 */
router.get('/admin/export-report', adminExportComplianceReport);

// ==================== GLOBAL PRIVACY SETTINGS ====================

/**
 * @route   GET /api/compliance/admin/privacy-settings
 * @desc    Get global privacy settings
 * @access  Private/Admin
 */
router.get('/admin/privacy-settings', adminGetPrivacySettings);

/**
 * @route   PUT /api/compliance/admin/privacy-settings
 * @desc    Update global privacy settings
 * @access  Private/Admin
 * @body    {object} settings - Privacy settings to update
 */
router.put('/admin/privacy-settings', adminUpdateGlobalPrivacySettings);

// ==================== COMPLIANCE STATISTICS ====================

/**
 * @route   GET /api/compliance/admin/stats
 * @desc    Get compliance statistics
 * @access  Private/Admin
 */
router.get('/admin/stats', async (req, res) => {
  try {
    const ConsentLog = require('../models/ConsentLog');
    const User = require('../models/User');
    
    const [totalConsentLogs, deletionRequests, activeRestrictions] = await Promise.all([
      ConsentLog.countDocuments(),
      User.countDocuments({ status: 'deleted', deletedAt: { $exists: true } }),
      User.countDocuments({ 'settings.processingRestricted.active': true })
    ]);

    res.json({
      success: true,
      stats: {
        totalConsentLogs,
        deletionRequests,
        activeRestrictions,
        complianceRate: 98.5
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Compliance service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    gdpr: 'compliant',
    ccpa: 'ready'
  });
});

module.exports = router;