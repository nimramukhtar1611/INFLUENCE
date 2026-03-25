const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

// Log admin action
const logAudit = async (adminId, action, data = {}) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetUser: data.targetUser,
      targetResource: data.targetResource,
      changes: data.changes,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

// Get audit logs (admin)
const getAuditLogs = catchAsync(async (req, res) => {
  const features = new APIFeatures(AuditLog.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const logs = await features.query
    .populate('adminId', 'fullName email')
    .populate('targetUser', 'fullName email');

  const total = await features.count();

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      total,
      pages: Math.ceil(total / (parseInt(req.query.limit) || 10))
    }
  });
});

// Get user audit trail (admin)
const getUserAuditTrail = catchAsync(async (req, res) => {
  const logs = await AuditLog.find({
    $or: [
      { targetUser: req.params.userId },
      { 'targetResource.id': req.params.userId }
    ]
  })
    .populate('adminId', 'fullName email')
    .sort('-createdAt');

  res.json({
    success: true,
    data: logs
  });
});

// Get audit summary (admin)
const getAuditSummary = catchAsync(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const dailyActivity = await AuditLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      period: `${days} days`,
      totalLogs: await AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
      summary,
      dailyActivity
    }
  });
});

module.exports = {
  logAudit,
  getAuditLogs,
  getUserAuditTrail,
  getAuditSummary
};