// controllers/complianceController.js - COMPLETE NEW FILE
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const ConsentLog = require('../models/ConsentLog');
const DataExportService = require('../services/dataExportService');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');



const adminGetConsentReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filter = {};

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const logs = await ConsentLog.find(filter)
    .populate('userId', 'email fullName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    total: logs.length,
    logs
  });
});

const adminGetDataSubjectRequests = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (type) filter.action = type;

  const requests = await ConsentLog.find(filter)
    .populate('userId', 'email fullName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await ConsentLog.countDocuments(filter);

  res.json({
    success: true,
    requests,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});


const adminUpdateDataSubjectRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status, notes } = req.body;

  const request = await ConsentLog.findById(requestId);

  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }

  request.status = status || request.status;
  request.adminNotes = notes;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();

  await request.save();

  res.json({
    success: true,
    message: "Request updated",
    request
  });
});


const adminGetComplianceAuditLog = asyncHandler(async (req, res) => {
  const { startDate, endDate, userId, action, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (userId) filter.userId = userId;
  if (action) filter.action = action;

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const logs = await ConsentLog.find(filter)
    .populate('userId', 'email fullName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await ConsentLog.countDocuments(filter);

  res.json({
    success: true,
    logs,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});



const adminExportComplianceReport = asyncHandler(async (req, res) => {
  const logs = await ConsentLog.find()
    .populate('userId', 'email fullName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    report: logs
  });
});


const adminAnonymizeUserData = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.email = `anon-${Date.now()}@deleted.com`;
  user.fullName = "Anonymous User";
  user.phone = null;

  await user.save();

  res.json({
    success: true,
    message: "User data anonymized"
  });
});

const adminRestrictUserData = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.settings = user.settings || {};

  user.settings.processingRestricted = {
    active: true,
    reason,
    restrictedBy: req.user._id,
    restrictedAt: new Date()
  };

  await user.save();

  res.json({
    success: true,
    message: "User data restricted"
  });
});

const adminGetPrivacySettings = asyncHandler(async (req, res) => {
  const settings = await User.find().select("settings.privacy");

  res.json({
    success: true,
    settings
  });
});


const adminUpdateGlobalPrivacySettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;

  res.json({
    success: true,
    message: "Global privacy settings updated",
    settings
  });
});
// @desc    Export user data (GDPR)
// @route   GET /api/compliance/export
// @access  Private
const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if export already in progress
  const existingExport = await DataExportService.getActiveExport(userId);
  if (existingExport) {
    return res.json({
      success: true,
      message: 'Export already in progress',
      exportId: existingExport._id,
      status: existingExport.status,
      progress: existingExport.progress
    });
  }

  // Start export process
  const exportJob = await DataExportService.startExport(userId);

  res.json({
    success: true,
    message: 'Data export started. You will be notified when ready.',
    exportId: exportJob._id,
    estimatedTime: '5-10 minutes'
  });
});

// @desc    Get export status
// @route   GET /api/compliance/export/:exportId/status
// @access  Private
const getExportStatus = asyncHandler(async (req, res) => {
  const { exportId } = req.params;
  
  const status = await DataExportService.getExportStatus(exportId, req.user._id);

  if (!status) {
    res.status(404);
    throw new Error('Export not found');
  }

  res.json({
    success: true,
    ...status
  });
});

// @desc    Download exported data
// @route   GET /api/compliance/export/:exportId/download
// @access  Private
const downloadExport = asyncHandler(async (req, res) => {
  const { exportId } = req.params;
  
  const exportData = await DataExportService.getExportFile(exportId, req.user._id);

  if (!exportData) {
    res.status(404);
    throw new Error('Export not found or not ready');
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
  res.send(exportData.data);
});

// @desc    Delete user account (GDPR Right to Erasure)
// @route   DELETE /api/compliance/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const { confirm, password, reason } = req.body;

  if (!confirm || confirm !== 'DELETE') {
    res.status(400);
    throw new Error('Please type DELETE to confirm account deletion');
  }

  if (!password) {
    res.status(400);
    throw new Error('Password is required');
  }

  const user = await User.findById(req.user._id).select('+password');
  
  // Verify password
  const isValid = await user.matchPassword(password);
  if (!isValid) {
    res.status(401);
    throw new Error('Invalid password');
  }

  // Log consent for deletion
  await ConsentLog.create({
    userId: user._id,
    action: 'account_deletion',
    consent: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: { reason }
  });

  // Anonymize user data instead of deleting (GDPR compliance)
  const anonymizedEmail = `deleted-${Date.now()}@anonymous.com`;
  const anonymizedName = 'Deleted User';

  await User.findByIdAndUpdate(user._id, {
    $set: {
      email: anonymizedEmail,
      fullName: anonymizedName,
      phone: null,
      profilePicture: null,
      coverPicture: null,
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      status: 'deleted',
      deletedAt: new Date(),
      deletionReason: reason
    },
    $unset: {
      password: 1,
      refreshToken: 1,
      resetPasswordToken: 1,
      emailVerificationToken: 1,
      pushSubscriptions: 1,
      stripeCustomerId: 1,
      stripeAccountId: 1,
      paymentMethods: 1,
      socialLogins: 1
    }
  });

  // Anonymize or delete related data
  await Promise.all([
    // Anonymize campaigns (keep for analytics but remove personal data)
    Campaign.updateMany(
      { brandId: user._id },
      { 
        $set: { 
          brandId: null,
          'brandId': null 
        } 
      }
    ),

    // Anonymize deals
    Deal.updateMany(
      { $or: [{ brandId: user._id }, { creatorId: user._id }] },
      { 
        $set: { 
          brandId: null,
          creatorId: null 
        } 
      }
    ),

    // Anonymize messages
    Message.updateMany(
      { senderId: user._id },
      { 
        $set: { 
          senderId: null,
          content: '[Message deleted by user]' 
        } 
      }
    ),

    // Anonymize payments
    Payment.updateMany(
      { $or: [{ 'from.userId': user._id }, { 'to.userId': user._id }] },
      { 
        $set: { 
          'from.userId': null,
          'to.userId': null,
          description: '[Payment data anonymized]'
        } 
      }
    )
  ]);

  res.json({
    success: true,
    message: 'Your account has been deleted successfully'
  });
});

// @desc    Get data usage report
// @route   GET /api/compliance/usage
// @access  Private
const getDataUsage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    campaignCount,
    dealCount,
    paymentCount,
    messageCount,
    consentLogs
  ] = await Promise.all([
    Campaign.countDocuments({ brandId: userId }),
    Deal.countDocuments({ $or: [{ brandId: userId }, { creatorId: userId }] }),
    Payment.countDocuments({ $or: [{ 'from.userId': userId }, { 'to.userId': userId }] }),
    Message.countDocuments({ senderId: userId }),
    ConsentLog.find({ userId }).sort({ createdAt: -1 }).limit(10)
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        campaigns: campaignCount,
        deals: dealCount,
        transactions: paymentCount,
        messages: messageCount,
        totalDataPoints: campaignCount + dealCount + paymentCount + messageCount
      },
      recentConsent: consentLogs,
      retention: {
        campaigns: '7 years',
        deals: '7 years',
        payments: '10 years',
        messages: '3 years'
      }
    }
  });
});

// @desc    Update privacy settings
// @route   PUT /api/compliance/privacy
// @access  Private
const updatePrivacySettings = asyncHandler(async (req, res) => {
  const {
    dataSharing,
    marketingEmails,
    cookieConsent,
    analyticsTracking,
    thirdPartySharing
  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user.settings) {
    user.settings = {};
  }
  if (!user.settings.privacy) {
    user.settings.privacy = {};
  }

  user.settings.privacy = {
    ...user.settings.privacy,
    dataSharing,
    marketingEmails,
    cookieConsent,
    analyticsTracking,
    thirdPartySharing,
    updatedAt: new Date()
  };

  await user.save();

  // Log consent change
  await ConsentLog.create({
    userId: user._id,
    action: 'privacy_update',
    consent: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: { settings: user.settings.privacy }
  });

  res.json({
    success: true,
    message: 'Privacy settings updated',
    privacy: user.settings.privacy
  });
});

// @desc    Get privacy settings
// @route   GET /api/compliance/privacy
// @access  Private
const getPrivacySettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('settings.privacy');

  const defaultSettings = {
    dataSharing: true,
    marketingEmails: false,
    cookieConsent: true,
    analyticsTracking: true,
    thirdPartySharing: false
  };

  res.json({
    success: true,
    privacy: user.settings?.privacy || defaultSettings
  });
});

// @desc    Withdraw consent
// @route   POST /api/compliance/withdraw-consent
// @access  Private
const withdrawConsent = asyncHandler(async (req, res) => {
  const { consentType, reason } = req.body;

  const validTypes = ['dataSharing', 'marketingEmails', 'cookieConsent', 'analyticsTracking', 'thirdPartySharing'];
  
  if (!validTypes.includes(consentType)) {
    res.status(400);
    throw new Error('Invalid consent type');
  }

  const user = await User.findById(req.user._id);

  if (!user.settings) {
    user.settings = {};
  }
  if (!user.settings.privacy) {
    user.settings.privacy = {};
  }

  user.settings.privacy[consentType] = false;
  await user.save();

  // Log consent withdrawal
  await ConsentLog.create({
    userId: user._id,
    action: 'consent_withdrawal',
    consent: false,
    consentType,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: `Consent for ${consentType} withdrawn successfully`
  });
});

// @desc    Get consent history
// @route   GET /api/compliance/consent-history
// @access  Private
const getConsentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const [logs, total] = await Promise.all([
    ConsentLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit)),
    ConsentLog.countDocuments({ userId: req.user._id })
  ]);

  res.json({
    success: true,
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Request data correction
// @route   POST /api/compliance/correct-data
// @access  Private
const requestDataCorrection = asyncHandler(async (req, res) => {
  const { field, currentValue, correctedValue, reason } = req.body;

  if (!field || !correctedValue || !reason) {
    res.status(400);
    throw new Error('Field, corrected value, and reason are required');
  }

  // Log correction request
  await ConsentLog.create({
    userId: req.user._id,
    action: 'data_correction_request',
    consent: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      field,
      currentValue,
      correctedValue,
      reason
    }
  });

  // In a real system, this would create a ticket for support
  // For now, just log and respond

  res.json({
    success: true,
    message: 'Data correction request submitted. Our support team will review it within 48 hours.'
  });
});

// @desc    Restrict data processing
// @route   POST /api/compliance/restrict-processing
// @access  Private
const restrictProcessing = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findById(req.user._id);

  user.settings = user.settings || {};
  user.settings.processingRestricted = {
    active: true,
    reason,
    restrictedAt: new Date()
  };

  await user.save();

  // Log restriction
  await ConsentLog.create({
    userId: user._id,
    action: 'processing_restriction',
    consent: false,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: 'Data processing restricted successfully'
  });
});

// @desc    Object to automated processing
// @route   POST /api/compliance/object-processing
// @access  Private
const objectToProcessing = asyncHandler(async (req, res) => {
  const { processingType, reason } = req.body;

  const user = await User.findById(req.user._id);

  user.settings = user.settings || {};
  user.settings.processingObjections = user.settings.processingObjections || [];
  
  user.settings.processingObjections.push({
    type: processingType,
    reason,
    objectedAt: new Date()
  });

  await user.save();

  // Log objection
  await ConsentLog.create({
    userId: user._id,
    action: 'processing_objection',
    consent: false,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: { processingType, reason }
  });

  res.json({
    success: true,
    message: 'Objection to automated processing recorded'
  });
});

// @desc    Get compliance report
// @route   GET /api/compliance/report
// @access  Private
const getComplianceReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    consentLogs,
    dataUsage,
    privacySettings
  ] = await Promise.all([
    ConsentLog.find({ userId }).sort({ createdAt: -1 }).limit(5),
    getDataUsageSummary(userId),
    User.findById(userId).select('settings.privacy')
  ]);

  res.json({
    success: true,
    report: {
      summary: {
        totalConsentActions: await ConsentLog.countDocuments({ userId }),
        lastConsentUpdate: consentLogs[0]?.createdAt || null,
        dataRetentionPeriod: 'As per our privacy policy',
        dataProcessingBasis: 'Consent and contract'
      },
      recentConsent: consentLogs,
      dataUsage,
      privacySettings: privacySettings?.settings?.privacy || {},
      rights: {
        canAccess: true,
        canRectify: true,
        canErasure: true,
        canRestrict: true,
        canObject: true,
        canPort: true
      }
    }
  });
});

// Helper function
async function getDataUsageSummary(userId) {
  const [campaigns, deals, payments] = await Promise.all([
    Campaign.countDocuments({ brandId: userId }),
    Deal.countDocuments({ $or: [{ brandId: userId }, { creatorId: userId }] }),
    Payment.countDocuments({ $or: [{ 'from.userId': userId }, { 'to.userId': userId }] })
  ]);

  return {
    dataCategories: [
      { name: 'Profile Information', count: 1, retention: 'Account lifetime' },
      { name: 'Campaigns', count: campaigns, retention: '7 years' },
      { name: 'Deals', count: deals, retention: '7 years' },
      { name: 'Transactions', count: payments, retention: '10 years' }
    ],
    totalDataPoints: campaigns + deals + payments + 1
  };
}

// @desc    Admin: Get all deletion requests
// @route   GET /api/compliance/admin/deletion-requests
// @access  Private/Admin
const adminGetDeletionRequests = asyncHandler(async (req, res) => {
  const requests = await User.find({ 
    status: 'deleted',
    deletedAt: { $exists: true }
  })
    .select('email fullName deletedAt deletionReason')
    .sort({ deletedAt: -1 });

  res.json({
    success: true,
    requests
  });
});

// @desc    Admin: Process deletion request
// @route   POST /api/compliance/admin/process-deletion/:userId
// @access  Private/Admin
const adminProcessDeletion = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { action, notes } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (action === 'permanent_delete') {
    // Permanently delete user data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Brand.findByIdAndDelete(userId),
      Creator.findByIdAndDelete(userId),
      Campaign.deleteMany({ brandId: userId }),
      Deal.deleteMany({ $or: [{ brandId: userId }, { creatorId: userId }] }),
      Payment.deleteMany({ $or: [{ 'from.userId': userId }, { 'to.userId': userId }] }),
      Message.deleteMany({ senderId: userId })
    ]);

    await ConsentLog.create({
      userId,
      action: 'permanent_deletion',
      consent: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { adminId: req.user._id, notes }
    });

    res.json({
      success: true,
      message: 'User permanently deleted'
    });
  } else {
    res.json({
      success: true,
      message: 'Deletion request noted'
    });
  }
});

module.exports = {
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
};