const ActivityLog = require('../models/ActivityLog');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/apiFeatures');

// Log activity
const logActivity = async (userId, action, details = {}) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      resource: details.resource,
      details: details.data,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: details.status || 'success'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Get user activities
const getUserActivities = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    ActivityLog.find({ userId: req.params.userId }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const activities = await features.query;
  const total = await features.count();

  res.json({
    success: true,
    data: activities,
    pagination: {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      total,
      pages: Math.ceil(total / (parseInt(req.query.limit) || 10))
    }
  });
});

// Get recent activities (admin)
const getRecentActivities = catchAsync(async (req, res) => {
  const { limit = 50 } = req.query;

  const activities = await ActivityLog.find({})
    .populate('userId', 'fullName email profilePicture userType')
    .sort('-createdAt')
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: activities
  });
});

// Get activity stats (admin)
const getActivityStats = catchAsync(async (req, res) => {
  const { days = 7 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Top actions
  const topActions = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      period: `${days} days`,
      dailyStats: stats,
      topActions
    }
  });
});

module.exports = {
  logActivity,
  getUserActivities,
  getRecentActivities,
  getActivityStats
};