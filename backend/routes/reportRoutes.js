const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { adminProtect } = require('../middleware/auth');
const {
  generateReport,
  getReports,
  getReport,
  deleteReport,
  downloadReport,
  scheduleReport,
  unscheduleReport,
  getScheduledReports,
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate
} = require('../controllers/admin/reportController');

// All routes are protected and require admin access
router.use(adminProtect);

// Validation rules
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value <= req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const validateGenerateReport = [
  body('type')
    .isIn([
      'users',
      'campaigns',
      'deals',
      'payments',
      'revenue',
      'engagement',
      'creators',
      'brands',
      'custom'
    ])
    .withMessage('Invalid report type'),
  
  body('dateRange.start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  
  body('dateRange.end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date')
    .custom((value, { req }) => {
      if (req.body.dateRange?.start && value <= req.body.dateRange.start) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('format')
    .optional()
    .isIn(['pdf', 'csv', 'excel', 'json'])
    .withMessage('Invalid export format'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'category', 'platform'])
    .withMessage('Invalid group by option')
];

const validateSchedule = [
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, or monthly'),
  
  body('recipients')
    .isArray()
    .withMessage('Recipients must be an array')
    .custom(recipients => {
      if (recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }
      return true;
    }),
  
  body('recipients.*')
    .isEmail()
    .withMessage('Invalid email address')
];

const validateTemplate = [
  body('name')
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('config')
    .isObject()
    .withMessage('Configuration is required'),
  
  body('config.type')
    .isIn([
      'users', 'campaigns', 'deals', 'payments', 
      'revenue', 'engagement', 'creators', 'brands', 'custom'
    ])
    .withMessage('Invalid report type'),
  
  body('config.dateRange')
    .optional()
    .isObject()
    .withMessage('Date range must be an object'),
  
  body('config.filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('config.groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'category', 'platform'])
    .withMessage('Invalid group by option')
];

// ==================== REPORT GENERATION ====================

/**
 * @route   POST /api/admin/reports/generate
 * @desc    Generate a new report
 * @access  Private/Admin
 */
router.post(
  '/generate',
  validateGenerateReport,
  generateReport
);

// ==================== REPORT MANAGEMENT ====================

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports with pagination and filters
 * @access  Private/Admin
 */
router.get(
  '/',
  [
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
    query('type')
      .optional()
      .isIn([
        'users', 'campaigns', 'deals', 'payments', 
        'revenue', 'engagement', 'creators', 'brands', 'custom'
      ])
      .withMessage('Invalid report type'),
    query('status')
      .optional()
      .isIn(['pending', 'generating', 'completed', 'failed'])
      .withMessage('Invalid status'),
    ...validateDateRange
  ],
  getReports
);

/**
 * @route   GET /api/admin/reports/:reportId
 * @desc    Get single report by ID
 * @access  Private/Admin
 */
router.get(
  '/:reportId',
  [
    param('reportId')
      .isMongoId()
      .withMessage('Invalid report ID')
  ],
  getReport
);

/**
 * @route   DELETE /api/admin/reports/:reportId
 * @desc    Delete a report
 * @access  Private/Admin
 */
router.delete(
  '/:reportId',
  [
    param('reportId')
      .isMongoId()
      .withMessage('Invalid report ID')
  ],
  deleteReport
);

/**
 * @route   GET /api/admin/reports/:reportId/download
 * @desc    Download a report file
 * @access  Private/Admin
 */
router.get(
  '/:reportId/download',
  [
    param('reportId')
      .isMongoId()
      .withMessage('Invalid report ID'),
    query('format')
      .optional()
      .isIn(['pdf', 'csv', 'excel', 'json'])
      .withMessage('Invalid format')
  ],
  downloadReport
);

// ==================== SCHEDULED REPORTS ====================

/**
 * @route   POST /api/admin/reports/:reportId/schedule
 * @desc    Schedule a report for automatic generation
 * @access  Private/Admin
 */
router.post(
  '/:reportId/schedule',
  [
    param('reportId')
      .isMongoId()
      .withMessage('Invalid report ID'),
    ...validateSchedule
  ],
  scheduleReport
);

/**
 * @route   POST /api/admin/reports/:reportId/unschedule
 * @desc    Remove scheduling from a report
 * @access  Private/Admin
 */
router.post(
  '/:reportId/unschedule',
  [
    param('reportId')
      .isMongoId()
      .withMessage('Invalid report ID')
  ],
  unscheduleReport
);

/**
 * @route   GET /api/admin/reports/scheduled/all
 * @desc    Get all scheduled reports
 * @access  Private/Admin
 */
router.get(
  '/scheduled/all',
  [
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
    query('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Invalid frequency')
  ],
  getScheduledReports
);

// ==================== REPORT TEMPLATES ====================

/**
 * @route   GET /api/admin/reports/templates/all
 * @desc    Get all report templates
 * @access  Private/Admin
 */
router.get(
  '/templates/all',
  getReportTemplates
);

/**
 * @route   POST /api/admin/reports/templates
 * @desc    Create a new report template
 * @access  Private/Admin
 */
router.post(
  '/templates',
  validateTemplate,
  createReportTemplate
);

/**
 * @route   PUT /api/admin/reports/templates/:templateId
 * @desc    Update a report template
 * @access  Private/Admin
 */
router.put(
  '/templates/:templateId',
  [
    param('templateId')
      .isMongoId()
      .withMessage('Invalid template ID'),
    ...validateTemplate
  ],
  updateReportTemplate
);

/**
 * @route   DELETE /api/admin/reports/templates/:templateId
 * @desc    Delete a report template
 * @access  Private/Admin
 */
router.delete(
  '/templates/:templateId',
  [
    param('templateId')
      .isMongoId()
      .withMessage('Invalid template ID')
  ],
  deleteReportTemplate
);

// ==================== REPORT STATISTICS ====================

/**
 * @route   GET /api/admin/reports/stats/summary
 * @desc    Get report generation statistics
 * @access  Private/Admin
 */
router.get(
  '/stats/summary',
  [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '12m'])
      .withMessage('Invalid period')
  ],
  async (req, res) => {
    try {
      const Report = require('../../models/Report');
      const { period = '30d' } = req.query;

      let startDate = new Date();
      switch(period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '12m':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const [total, completed, failed, generating] = await Promise.all([
        Report.countDocuments({ createdAt: { $gte: startDate } }),
        Report.countDocuments({ status: 'completed', createdAt: { $gte: startDate } }),
        Report.countDocuments({ status: 'failed', createdAt: { $gte: startDate } }),
        Report.countDocuments({ 
          status: { $in: ['pending', 'generating'] },
          createdAt: { $gte: startDate }
        })
      ]);

      const byType = await Report.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const byStatus = await Report.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const averageGenerationTime = await Report.aggregate([
        {
          $match: {
            status: 'completed',
            'metadata.generatedAt': { $exists: true },
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$metadata.generatedAt', '$createdAt'] },
                1000
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avg: { $avg: '$duration' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          total,
          completed,
          failed,
          generating,
          successRate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
          byType: byType.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {}),
          byStatus: byStatus.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {}),
          averageGenerationTime: averageGenerationTime[0]?.avg || 0
        }
      });
    } catch (error) {
      console.error('Error getting report stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report statistics'
      });
    }
  }
);

// ==================== BULK OPERATIONS ====================

/**
 * @route   DELETE /api/admin/reports/bulk/delete
 * @desc    Bulk delete reports
 * @access  Private/Admin
 */
router.delete(
  '/bulk/delete',
  [
    body('reportIds')
      .isArray()
      .withMessage('Report IDs must be an array')
      .custom(ids => {
        if (ids.length === 0) {
          throw new Error('At least one report ID is required');
        }
        return true;
      }),
    body('reportIds.*')
      .isMongoId()
      .withMessage('Invalid report ID format')
  ],
  async (req, res) => {
    try {
      const { reportIds } = req.body;
      const Report = require('../../models/Report');

      const result = await Report.deleteMany({
        _id: { $in: reportIds }
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} reports`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete reports'
      });
    }
  }
);

/**
 * @route   POST /api/admin/reports/bulk/generate
 * @desc    Generate multiple reports at once
 * @access  Private/Admin
 */
router.post(
  '/bulk/generate',
  [
    body('reports')
      .isArray()
      .withMessage('Reports must be an array')
      .custom(reports => {
        if (reports.length === 0) {
          throw new Error('At least one report configuration is required');
        }
        if (reports.length > 10) {
          throw new Error('Cannot generate more than 10 reports at once');
        }
        return true;
      }),
    body('reports.*.type')
      .isIn([
        'users', 'campaigns', 'deals', 'payments',
        'revenue', 'engagement', 'creators', 'brands', 'custom'
      ])
      .withMessage('Invalid report type'),
    body('reports.*.dateRange')
      .optional()
      .isObject()
      .withMessage('Date range must be an object')
  ],
  async (req, res) => {
    try {
      const { reports } = req.body;
      const Report = require('../../models/Report');
      const analyticsService = require('../../services/analyticsService');

      const generatedReports = [];

      for (const config of reports) {
        try {
          const report = await Report.create({
            userId: req.user._id,
            type: config.type,
            name: config.name || `${config.type} Report`,
            description: config.description,
            config: {
              dateRange: config.dateRange,
              filters: config.filters,
              metrics: config.metrics,
              groupBy: config.groupBy
            },
            status: 'generating',
            progress: 0
          });

          // Start generation in background
          analyticsService.generateReport(req.user._id, config)
            .then(async (result) => {
              report.data = result.data;
              report.summary = result.summary;
              report.charts = result.charts;
              report.status = 'completed';
              report.progress = 100;
              await report.save();
            })
            .catch(async (error) => {
              report.status = 'failed';
              report.error = error.message;
              await report.save();
            });

          generatedReports.push(report);
        } catch (error) {
          console.error('Error generating individual report:', error);
        }
      }

      res.json({
        success: true,
        message: `Started generating ${generatedReports.length} reports`,
        reports: generatedReports
      });
    } catch (error) {
      console.error('Error bulk generating reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate reports'
      });
    }
  }
);

// ==================== EXPORT ALL REPORTS ====================

/**
 * @route   GET /api/admin/reports/export/all
 * @desc    Export all reports metadata
 * @access  Private/Admin
 */
router.get(
  '/export/all',
  [
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('Invalid format')
      .default('json')
  ],
  async (req, res) => {
    try {
      const { format = 'json' } = req.query;
      const Report = require('../../models/Report');
      
      const reports = await Report.find({})
        .populate('userId', 'email fullName')
        .sort({ createdAt: -1 })
        .lean();

      if (format === 'csv') {
        // Convert to CSV
        const headers = ['ID', 'Name', 'Type', 'Status', 'Created By', 'Created At', 'Progress'];
        const csvRows = reports.map(r => [
          r._id,
          r.name || r.type,
          r.type,
          r.status,
          r.userId?.email || 'Unknown',
          r.createdAt,
          r.progress || 0
        ]);

        const csv = [
          headers.join(','),
          ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="all-reports.csv"');
        return res.send(csv);
      }

      // Return JSON
      res.json({
        success: true,
        reports
      });
    } catch (error) {
      console.error('Error exporting reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export reports'
      });
    }
  }
);

module.exports = router;