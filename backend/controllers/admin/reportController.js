const Report = require('../../models/Report');
const User = require('../../models/User');
const Brand = require('../../models/Brand');
const Creator = require('../../models/Creator');
const Campaign = require('../../models/Campaign');
const Deal = require('../../models/Deal');
const Payment = require('../../models/Payment');
const AuditLog = require('../../models/AuditLog');
const analyticsService = require('../../services/analyticsService');
const { sendEmail } = require('../../services/emailService');
const notificationService = require('../../services/notificationService');
const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csvGenerator = require('../../utils/csvGenerator');

// ==================== REPORT GENERATION ====================

/**
 * Generate a new report
 * @route POST /api/admin/reports/generate
 * @access Private/Admin
 */
exports.generateReport = async (req, res) => {
  try {
    const {
      type,
      name,
      description,
      dateRange,
      filters,
      metrics,
      groupBy,
      sortBy,
      sortOrder,
      format = 'json',
      chartTypes = [],
      includeSummary = true,
      includeCharts = true,
      includeRawData = true
    } = req.body;

    // Validate required fields
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Report type is required'
      });
    }

    // Create report record
    const report = await Report.create({
      userId: req.user._id,
      type,
      name: name || `${type.replace('_', ' ')} Report`,
      description,
      config: {
        dateRange: dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        filters: filters || {},
        metrics: metrics || [],
        groupBy: groupBy || 'day',
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      },
      status: 'generating',
      progress: 0,
      format,
      chartTypes,
      includeSummary,
      includeCharts,
      includeRawData,
      metadata: {
        requestedAt: new Date(),
        requestedBy: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Start report generation in background
    generateReportInBackground(report._id).catch(error => {
      console.error('Background report generation failed:', error);
    });

    // Log action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'report_generation_started',
      targetResource: {
        type: 'report',
        id: report._id
      },
      metadata: { type, name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(202).json({
      success: true,
      message: 'Report generation started',
      report: {
        id: report._id,
        name: report.name,
        type: report.type,
        status: report.status,
        progress: report.progress,
        createdAt: report.createdAt
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report'
    });
  }
};

/**
 * Background report generation
 * @param {string} reportId - Report ID
 */
async function generateReportInBackground(reportId) {
  let report = null;

  try {
    report = await Report.findById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    // Update status
    report.status = 'generating';
    report.progress = 10;
    await report.save();

    // Generate data based on report type
    let data = [];
    let summary = {};
    let charts = {};

    switch(report.type) {
      case 'users':
        ({ data, summary, charts } = await generateUserReport(report));
        break;
      case 'campaigns':
        ({ data, summary, charts } = await generateCampaignReport(report));
        break;
      case 'deals':
        ({ data, summary, charts } = await generateDealReport(report));
        break;
      case 'payments':
        ({ data, summary, charts } = await generatePaymentReport(report));
        break;
      case 'revenue':
        ({ data, summary, charts } = await generateRevenueReport(report));
        break;
      case 'engagement':
        ({ data, summary, charts } = await generateEngagementReport(report));
        break;
      case 'creators':
        ({ data, summary, charts } = await generateCreatorReport(report));
        break;
      case 'brands':
        ({ data, summary, charts } = await generateBrandReport(report));
        break;
      case 'custom':
        ({ data, summary, charts } = await generateCustomReport(report));
        break;
      default:
        throw new Error(`Unsupported report type: ${report.type}`);
    }

    report.progress = 70;
    await report.save();

    // Generate file if format is specified
    if (report.format && report.format !== 'json') {
      const fileInfo = await generateReportFile(report, data, summary, charts);
      report.fileUrl = fileInfo.url;
      report.fileSize = fileInfo.size;
      report.filename = fileInfo.filename;
    }

    // Update report with generated data
    report.data = report.includeRawData ? data : null;
    report.summary = report.includeSummary ? summary : null;
    report.charts = report.includeCharts ? charts : null;
    report.status = 'completed';
    report.progress = 100;
    report.metadata.generatedAt = new Date();
    report.metadata.recordCount = data.length;
    await report.save();

    // Log completion
    await AuditLog.create({
      adminId: report.userId,
      action: 'report_generation_completed',
      targetResource: {
        type: 'report',
        id: report._id
      },
      metadata: { 
        type: report.type,
        recordCount: data.length,
        fileSize: report.fileSize
      }
    });

    // Notify admin if requested
    if (report.config.notifyOnCompletion) {
      await notificationService.createNotification(
        report.userId,
        'system',
        'Report Ready',
        `Your ${report.name} report has been generated and is ready for download.`,
        { reportId: report._id, url: `/admin/reports/${report._id}/download` }
      );
    }

    console.log(`✅ Report ${reportId} generated successfully`);

  } catch (error) {
    console.error('Background report generation error:', error);
    
    // Update report with error
    await Report.findByIdAndUpdate(reportId, {
      status: 'failed',
      error: error.message,
      progress: 0
    });

    // Log error
    try {
      await AuditLog.create({
        adminId: report?.userId || null,
        action: 'report_generation_failed',
        targetResource: {
          type: 'report',
          id: reportId
        },
        metadata: { error: error.message }
      });
    } catch (auditError) {
      console.error('Failed to write report failure audit log:', auditError.message);
    }
  }
}

// ==================== REPORT TYPE GENERATORS ====================

/**
 * Generate user report
 */
async function generateUserReport(report) {
  const { dateRange, filters, groupBy, sortBy, sortOrder } = report.config;
  
  const query = {};
  
  if (dateRange?.start || dateRange?.end) {
    query.createdAt = {};
    if (dateRange?.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.createdAt.$lte = new Date(dateRange.end);
  }
  
  if (filters?.userType) query.userType = filters.userType;
  if (filters?.status) query.status = filters.status;
  if (filters?.verified !== undefined) query.isVerified = filters.verified;
  if (filters?.country) query['location.country'] = filters.country;

  // Get users
  const users = await User.find(query)
    .select('fullName email userType status isVerified createdAt lastLogin location')
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 })
    .lean();

  // Calculate summary
  const summary = {
    total: users.length,
    brands: users.filter(u => u.userType === 'brand').length,
    creators: users.filter(u => u.userType === 'creator').length,
    verified: users.filter(u => u.isVerified).length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  // Group data
  let groupedData = users;
  if (groupBy) {
    groupedData = groupDataBy(users, groupBy, 'createdAt');
  }

  // Generate charts
  const charts = {
    userTypes: {
      type: 'pie',
      data: [
        { label: 'Brands', value: summary.brands, color: '#4F46E5' },
        { label: 'Creators', value: summary.creators, color: '#10B981' }
      ]
    },
    userStatus: {
      type: 'pie',
      data: [
        { label: 'Active', value: summary.active, color: '#10B981' },
        { label: 'Pending', value: summary.pending, color: '#F59E0B' },
        { label: 'Suspended', value: summary.suspended, color: '#EF4444' }
      ]
    },
    userGrowth: {
      type: 'line',
      data: users.map(u => ({
        date: u.createdAt,
        value: 1
      }))
    },
    topLocations: {
      type: 'bar',
      data: Object.entries(
        users.reduce((acc, u) => {
          const country = u.location?.country || 'Unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([country, count]) => ({ label: country, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    }
  };

  return { data: users, summary, charts };
}

/**
 * Generate campaign report
 */
async function generateCampaignReport(report) {
  const { dateRange, filters, groupBy, sortBy, sortOrder } = report.config;
  
  const query = {};
  
  if (dateRange?.start || dateRange?.end) {
    query.createdAt = {};
    if (dateRange?.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.createdAt.$lte = new Date(dateRange.end);
  }
  
  if (filters?.status) query.status = filters.status;
  if (filters?.category) query.category = filters.category;

  // Get campaigns with brand info
  const campaigns = await Campaign.find(query)
    .populate('brandId', 'brandName industry')
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 })
    .lean();

  // Calculate summary
  const summary = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
    totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
    avgBudget: campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (c.budget || 0), 0) / campaigns.length 
      : 0,
    avgProgress: campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (c.progress || 0), 0) / campaigns.length 
      : 0
  };

  // Group by status
  const byStatus = {};
  campaigns.forEach(c => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  // Group by category
  const byCategory = {};
  campaigns.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  });

  // Generate charts
  const charts = {
    campaignStatus: {
      type: 'pie',
      data: Object.entries(byStatus).map(([status, count], index) => ({
        label: status,
        value: count,
        color: getStatusColor(status)
      }))
    },
    campaignCategories: {
      type: 'bar',
      data: Object.entries(byCategory)
        .map(([category, count]) => ({ label: category, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    },
    budgetVsSpent: {
      type: 'bar',
      data: campaigns.slice(0, 10).map(c => ({
        label: c.title?.substring(0, 20) + '...',
        budget: c.budget || 0,
        spent: c.spent || 0
      }))
    },
    campaignsOverTime: {
      type: 'line',
      data: campaigns.map(c => ({
        date: c.createdAt,
        value: 1
      }))
    }
  };

  // Group data if requested
  let data = campaigns;
  if (groupBy) {
    data = groupDataBy(campaigns, groupBy, 'createdAt');
  }

  return { data, summary, charts };
}

/**
 * Generate deal report
 */
async function generateDealReport(report) {
  const { dateRange, filters, groupBy, sortBy, sortOrder } = report.config;
  
  const query = {};
  
  if (dateRange?.start || dateRange?.end) {
    query.createdAt = {};
    if (dateRange?.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.createdAt.$lte = new Date(dateRange.end);
  }
  
  if (filters?.status) query.status = filters.status;
  if (filters?.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters?.minBudget) query.budget = { $gte: filters.minBudget };
  if (filters?.maxBudget) query.budget = { ...query.budget, $lte: filters.maxBudget };

  // Get deals with relations
  const deals = await Deal.find(query)
    .populate('brandId', 'brandName')
    .populate('creatorId', 'displayName handle')
    .populate('campaignId', 'title')
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 })
    .lean();

  // Calculate summary
  const summary = {
    total: deals.length,
    completed: deals.filter(d => d.status === 'completed').length,
    pending: deals.filter(d => d.status === 'pending').length,
    inProgress: deals.filter(d => ['accepted', 'in-progress'].includes(d.status)).length,
    cancelled: deals.filter(d => d.status === 'cancelled').length,
    disputed: deals.filter(d => d.status === 'disputed').length,
    totalValue: deals.reduce((sum, d) => sum + (d.budget || 0), 0),
    totalFees: deals.reduce((sum, d) => sum + (d.platformFee || 0), 0),
    avgValue: deals.length > 0 
      ? deals.reduce((sum, d) => sum + (d.budget || 0), 0) / deals.length 
      : 0,
    avgCompletionTime: calculateAvgCompletionTime(deals)
  };

  // Group by status
  const byStatus = {};
  deals.forEach(d => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });

  // Top brands by deal value
  const brandDeals = {};
  deals.forEach(d => {
    if (d.brandId) {
      const brandId = d.brandId._id.toString();
      if (!brandDeals[brandId]) {
        brandDeals[brandId] = {
          brand: d.brandId.brandName,
          deals: 0,
          value: 0
        };
      }
      brandDeals[brandId].deals++;
      brandDeals[brandId].value += d.budget || 0;
    }
  });

  const topBrands = Object.values(brandDeals)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top creators by earnings
  const creatorEarnings = {};
  deals.forEach(d => {
    if (d.creatorId && d.status === 'completed') {
      const creatorId = d.creatorId._id.toString();
      if (!creatorEarnings[creatorId]) {
        creatorEarnings[creatorId] = {
          creator: d.creatorId.displayName,
          handle: d.creatorId.handle,
          deals: 0,
          earnings: 0
        };
      }
      creatorEarnings[creatorId].deals++;
      creatorEarnings[creatorId].earnings += d.netAmount || 0;
    }
  });

  const topCreators = Object.values(creatorEarnings)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  // Generate charts
  const charts = {
    dealStatus: {
      type: 'pie',
      data: Object.entries(byStatus).map(([status, count], index) => ({
        label: status,
        value: count,
        color: getDealStatusColor(status)
      }))
    },
    dealsOverTime: {
      type: 'line',
      data: deals.map(d => ({
        date: d.createdAt,
        value: d.budget || 0
      }))
    },
    topBrands: {
      type: 'bar',
      data: topBrands.map(b => ({
        label: b.brand,
        value: b.value
      }))
    },
    topCreators: {
      type: 'bar',
      data: topCreators.map(c => ({
        label: c.creator,
        value: c.earnings
      }))
    }
  };

  // Group data if requested
  let data = deals;
  if (groupBy) {
    data = groupDataBy(deals, groupBy, 'createdAt');
  }

  return { data, summary, charts };
}

/**
 * Generate payment report
 */
async function generatePaymentReport(report) {
  const { dateRange, filters, groupBy, sortBy, sortOrder } = report.config;
  
  const query = {};
  
  if (dateRange?.start || dateRange?.end) {
    query.createdAt = {};
    if (dateRange?.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.createdAt.$lte = new Date(dateRange.end);
  }
  
  if (filters?.status) query.status = filters.status;
  if (filters?.type) query.type = filters.type;
  if (filters?.minAmount) query.amount = { $gte: filters.minAmount };
  if (filters?.maxAmount) query.amount = { ...query.amount, $lte: filters.maxAmount };

  // Get payments
  const payments = await Payment.find(query)
    .populate('from.userId', 'fullName email')
    .populate('to.userId', 'fullName email')
    .populate('dealId', 'campaignId')
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 })
    .lean();

  // Calculate summary
  const summary = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalFees: payments.reduce((sum, p) => sum + (p.fee || 0), 0),
    totalNet: payments.reduce((sum, p) => sum + (p.netAmount || 0), 0),
    avgAmount: payments.length > 0 
      ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length 
      : 0
  };

  // Group by type
  const byType = {};
  payments.forEach(p => {
    byType[p.type] = (byType[p.type] || 0) + 1;
  });

  // Group by payment method
  const byMethod = {};
  payments.forEach(p => {
    const method = p.paymentMethod?.type || 'unknown';
    byMethod[method] = (byMethod[method] || 0) + 1;
  });

  // Generate charts
  const charts = {
    paymentStatus: {
      type: 'pie',
      data: [
        { label: 'Completed', value: summary.completed, color: '#10B981' },
        { label: 'Pending', value: summary.pending, color: '#F59E0B' },
        { label: 'Failed', value: summary.failed, color: '#EF4444' },
        { label: 'Refunded', value: summary.refunded, color: '#8B5CF6' }
      ]
    },
    paymentTypes: {
      type: 'pie',
      data: Object.entries(byType).map(([type, count], index) => ({
        label: type,
        value: count,
        color: getPaymentColor(index)
      }))
    },
    paymentMethods: {
      type: 'pie',
      data: Object.entries(byMethod).map(([method, count], index) => ({
        label: method,
        value: count,
        color: getMethodColor(method)
      }))
    },
    revenueOverTime: {
      type: 'line',
      data: payments.map(p => ({
        date: p.createdAt,
        value: p.amount || 0
      }))
    }
  };

  // Group data if requested
  let data = payments;
  if (groupBy) {
    data = groupDataBy(payments, groupBy, 'createdAt', 'amount');
  }

  return { data, summary, charts };
}

/**
 * Generate revenue report
 */
async function generateRevenueReport(report) {
  const { dateRange, filters, groupBy } = report.config;
  
  const query = { status: 'completed' };
  
  if (dateRange?.start || dateRange?.end) {
    query.createdAt = {};
    if (dateRange?.start) query.createdAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.createdAt.$lte = new Date(dateRange.end);
  }

  // Get payments
  const payments = await Payment.find(query).lean();

  // Get subscriptions
  const subscriptions = await Subscription.find({
    status: 'active',
    ...(dateRange?.start || dateRange?.end ? {
      'billingPeriod.start': { $gte: new Date(dateRange.start) },
      'billingPeriod.end': { $lte: new Date(dateRange.end) }
    } : {})
  }).lean();

  // Calculate revenue metrics
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFees = payments.reduce((sum, p) => sum + (p.fee || 0), 0);
  const netRevenue = totalRevenue - totalFees;

  const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + (s.planDetails?.price || 0), 0);
  const oneTimeRevenue = payments.filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const commissionRevenue = payments.filter(p => p.type === 'commission')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Group by month
  const monthlyData = {};
  payments.forEach(p => {
    const date = new Date(p.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[key]) {
      monthlyData[key] = {
        month: key,
        revenue: 0,
        fees: 0,
        net: 0,
        count: 0
      };
    }
    
    monthlyData[key].revenue += p.amount || 0;
    monthlyData[key].fees += p.fee || 0;
    monthlyData[key].net += (p.amount || 0) - (p.fee || 0);
    monthlyData[key].count++;
  });

  const summary = {
    totalRevenue,
    totalFees,
    netRevenue,
    subscriptionRevenue,
    oneTimeRevenue,
    commissionRevenue,
    averageTransactionValue: payments.length > 0 ? totalRevenue / payments.length : 0,
    activeSubscriptions: subscriptions.length,
    projectedAnnualRevenue: subscriptionRevenue * 12
  };

  const charts = {
    monthlyRevenue: {
      type: 'line',
      data: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
    },
    revenueBreakdown: {
      type: 'pie',
      data: [
        { label: 'Subscription Revenue', value: subscriptionRevenue, color: '#4F46E5' },
        { label: 'One-time Payments', value: oneTimeRevenue, color: '#10B981' },
        { label: 'Commission Revenue', value: commissionRevenue, color: '#F59E0B' }
      ]
    },
    feeBreakdown: {
      type: 'pie',
      data: [
        { label: 'Platform Fees', value: totalFees * 0.7, color: '#EF4444' },
        { label: 'Gateway Fees', value: totalFees * 0.3, color: '#8B5CF6' }
      ]
    }
  };

  return { 
    data: Object.values(monthlyData), 
    summary, 
    charts 
  };
}

/**
 * Generate engagement report
 */
async function generateEngagementReport(report) {
  const { dateRange, filters, groupBy } = report.config;
  
  const query = { status: 'completed' };
  
  if (dateRange?.start || dateRange?.end) {
    query.completedAt = {};
    if (dateRange?.start) query.completedAt.$gte = new Date(dateRange.start);
    if (dateRange?.end) query.completedAt.$lte = new Date(dateRange.end);
  }

  // Get deals with deliverables
  const deals = await Deal.find(query)
    .populate('deliverables')
    .populate('brandId', 'brandName')
    .populate('creatorId', 'displayName handle')
    .lean();

  // Calculate engagement metrics
  let totalImpressions = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalReach = 0;

  const platformData = {};

  deals.forEach(deal => {
    deal.deliverables?.forEach(del => {
      const platform = del.platform || 'other';
      const metrics = del.metrics || del.performance || {};
      
      totalImpressions += metrics.impressions || metrics.views || 0;
      totalLikes += metrics.likes || 0;
      totalComments += metrics.comments || 0;
      totalShares += metrics.shares || 0;
      totalClicks += metrics.clicks || 0;
      totalConversions += metrics.conversions || 0;
      totalReach += metrics.reach || 0;

      if (!platformData[platform]) {
        platformData[platform] = {
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          conversions: 0,
          spend: 0
        };
      }

      platformData[platform].impressions += metrics.impressions || metrics.views || 0;
      platformData[platform].likes += metrics.likes || 0;
      platformData[platform].comments += metrics.comments || 0;
      platformData[platform].shares += metrics.shares || 0;
      platformData[platform].clicks += metrics.clicks || 0;
      platformData[platform].conversions += metrics.conversions || 0;
      platformData[platform].spend += del.budget || 0;
    });
  });

  const totalEngagements = totalLikes + totalComments + totalShares;
  const engagementRate = totalImpressions > 0 
    ? (totalEngagements / totalImpressions) * 100 
    : 0;
  const ctr = totalImpressions > 0 
    ? (totalClicks / totalImpressions) * 100 
    : 0;
  const conversionRate = totalClicks > 0 
    ? (totalConversions / totalClicks) * 100 
    : 0;

  const summary = {
    totalImpressions,
    totalEngagements,
    totalLikes,
    totalComments,
    totalShares,
    totalClicks,
    totalConversions,
    totalReach,
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    ctr: parseFloat(ctr.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    averageCPE: totalEngagements > 0 
      ? deals.reduce((sum, d) => sum + (d.budget || 0), 0) / totalEngagements 
      : 0,
    averageCPM: totalImpressions > 0 
      ? (deals.reduce((sum, d) => sum + (d.budget || 0), 0) / totalImpressions) * 1000 
      : 0
  };

  const charts = {
    platformPerformance: {
      type: 'bar',
      data: Object.entries(platformData).map(([platform, metrics]) => ({
        label: platform,
        impressions: metrics.impressions,
        engagements: metrics.likes + metrics.comments + metrics.shares,
        clicks: metrics.clicks
      }))
    },
    engagementBreakdown: {
      type: 'pie',
      data: [
        { label: 'Likes', value: totalLikes, color: '#4F46E5' },
        { label: 'Comments', value: totalComments, color: '#10B981' },
        { label: 'Shares', value: totalShares, color: '#F59E0B' }
      ]
    },
    funnelMetrics: {
      type: 'funnel',
      data: [
        { stage: 'Impressions', value: totalImpressions },
        { stage: 'Clicks', value: totalClicks },
        { stage: 'Conversions', value: totalConversions }
      ]
    }
  };

  return { 
    data: Object.entries(platformData).map(([platform, metrics]) => ({
      platform,
      ...metrics
    })), 
    summary, 
    charts 
  };
}

/**
 * Generate creator report
 */
async function generateCreatorReport(report) {
  const { dateRange, filters, sortBy, sortOrder, limit = 100 } = report.config;
  
  const query = {};
  
  if (filters?.niche) query.niches = filters.niche;
  if (filters?.verified !== undefined) query.isVerified = filters.verified;
  if (filters?.minFollowers) query.totalFollowers = { $gte: filters.minFollowers };
  if (filters?.maxFollowers) query.totalFollowers = { 
    ...query.totalFollowers, 
    $lte: filters.maxFollowers 
  };
  if (filters?.minEngagement) query.averageEngagement = { $gte: filters.minEngagement };

  // Get creators
  const creators = await Creator.find(query)
    .select('displayName handle totalFollowers averageEngagement stats profilePicture createdAt')
    .lean();

  // Get deal data for each creator
  const creatorPerformance = await Promise.all(
    creators.map(async (creator) => {
      const deals = await Deal.find({
        creatorId: creator._id,
        status: 'completed',
        ...(dateRange?.start || dateRange?.end ? {
          completedAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
          }
        } : {})
      }).lean();

      const totalEarnings = deals.reduce((sum, d) => sum + (d.netAmount || 0), 0);
      const totalDeals = deals.length;
      const avgDealValue = totalDeals > 0 ? totalEarnings / totalDeals : 0;
      
      let totalEngagement = 0;
      deals.forEach(deal => {
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
        }
      });

      return {
        ...creator,
        earnings: totalEarnings,
        deals: totalDeals,
        avgDealValue,
        totalEngagement,
        rating: creator.stats?.averageRating || 0
      };
    })
  );

  // Sort
  const sorted = creatorPerformance.sort((a, b) => {
    const field = sortBy || 'earnings';
    const order = sortOrder === 'desc' ? -1 : 1;
    return (a[field] - b[field]) * order;
  });

  const summary = {
    totalCreators: creators.length,
    totalEarnings: sorted.reduce((sum, c) => sum + c.earnings, 0),
    totalDeals: sorted.reduce((sum, c) => sum + c.deals, 0),
    avgEngagement: sorted.reduce((sum, c) => sum + (c.averageEngagement || 0), 0) / creators.length,
    avgRating: sorted.reduce((sum, c) => sum + c.rating, 0) / creators.length,
    avgEarnings: sorted.reduce((sum, c) => sum + c.earnings, 0) / creators.length
  };

  // Generate charts
  const charts = {
    topEarners: {
      type: 'bar',
      data: sorted.slice(0, 10).map(c => ({
        label: c.displayName,
        value: c.earnings
      }))
    },
    followerDistribution: {
      type: 'histogram',
      data: sorted.map(c => c.totalFollowers || 0)
    },
    engagementDistribution: {
      type: 'histogram',
      data: sorted.map(c => c.averageEngagement || 0)
    }
  };

  return { 
    data: sorted.slice(0, limit), 
    summary, 
    charts 
  };
}

/**
 * Generate brand report
 */
async function generateBrandReport(report) {
  const { dateRange, filters, sortBy, sortOrder, limit = 100 } = report.config;
  
  const query = {};
  
  if (filters?.industry) query.industry = filters.industry;
  if (filters?.verified !== undefined) query.isVerified = filters.verified;

  // Get brands
  const brands = await Brand.find(query)
    .select('brandName industry logo stats createdAt')
    .lean();

  // Get campaign and deal data for each brand
  const brandPerformance = await Promise.all(
    brands.map(async (brand) => {
      const campaigns = await Campaign.find({ 
        brandId: brand._id,
        ...(dateRange?.start || dateRange?.end ? {
          createdAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
          }
        } : {})
      }).lean();

      const deals = await Deal.find({
        brandId: brand._id,
        status: 'completed',
        ...(dateRange?.start || dateRange?.end ? {
          completedAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
          }
        } : {})
      }).lean();

      const totalSpent = deals.reduce((sum, d) => sum + (d.budget || 0), 0);
      const totalDeals = deals.length;
      const totalCampaigns = campaigns.length;
      const avgDealValue = totalDeals > 0 ? totalSpent / totalDeals : 0;

      // Calculate ROI (simplified)
      let totalRevenue = 0;
      deals.forEach(deal => {
        if (deal.metrics) {
          totalRevenue += (deal.metrics.conversions || 0) * 50; // Estimate
        }
      });

      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

      return {
        ...brand,
        spent: totalSpent,
        deals: totalDeals,
        campaigns: totalCampaigns,
        avgDealValue,
        revenue: totalRevenue,
        roi: parseFloat(roi.toFixed(2)),
        creators: brand.stats?.totalCreators || 0,
        rating: brand.stats?.averageRating || 0
      };
    })
  );

  // Sort
  const sorted = brandPerformance.sort((a, b) => {
    const field = sortBy || 'spent';
    const order = sortOrder === 'desc' ? -1 : 1;
    return (a[field] - b[field]) * order;
  });

  const summary = {
    totalBrands: brands.length,
    totalSpent: sorted.reduce((sum, b) => sum + b.spent, 0),
    totalDeals: sorted.reduce((sum, b) => sum + b.deals, 0),
    totalCampaigns: sorted.reduce((sum, b) => sum + b.campaigns, 0),
    avgROI: sorted.reduce((sum, b) => sum + b.roi, 0) / sorted.length,
    avgRating: sorted.reduce((sum, b) => sum + b.rating, 0) / sorted.length
  };

  // Group by industry
  const industryData = {};
  sorted.forEach(b => {
    if (!industryData[b.industry]) {
      industryData[b.industry] = {
        count: 0,
        spent: 0,
        deals: 0
      };
    }
    industryData[b.industry].count++;
    industryData[b.industry].spent += b.spent;
    industryData[b.industry].deals += b.deals;
  });

  const charts = {
    topSpenders: {
      type: 'bar',
      data: sorted.slice(0, 10).map(b => ({
        label: b.brandName,
        value: b.spent
      }))
    },
    industryBreakdown: {
      type: 'pie',
      data: Object.entries(industryData).map(([industry, data], index) => ({
        label: industry,
        value: data.spent,
        color: getIndustryColor(index)
      }))
    },
    roiDistribution: {
      type: 'scatter',
      data: sorted.map(b => ({
        x: b.spent,
        y: b.roi,
        label: b.brandName
      }))
    }
  };

  return { 
    data: sorted.slice(0, limit), 
    summary, 
    charts 
  };
}

/**
 * Generate custom report
 */
async function generateCustomReport(report) {
  const { collections, aggregations } = report.config;
  
  const results = {};

  for (const collection of collections || []) {
    switch(collection) {
      case 'users':
        results.users = await User.find().limit(100).lean();
        break;
      case 'brands':
        results.brands = await Brand.find().limit(100).lean();
        break;
      case 'creators':
        results.creators = await Creator.find().limit(100).lean();
        break;
      case 'campaigns':
        results.campaigns = await Campaign.find().limit(100).lean();
        break;
      case 'deals':
        results.deals = await Deal.find().limit(100).lean();
        break;
      case 'payments':
        results.payments = await Payment.find().limit(100).lean();
        break;
    }
  }

  // Run custom aggregations
  if (aggregations) {
    for (const [key, pipeline] of Object.entries(aggregations)) {
      try {
        results[key] = await mongoose.connection.db
          .collection(pipeline.collection)
          .aggregate(pipeline.stages)
          .toArray();
      } catch (error) {
        console.error(`Aggregation ${key} failed:`, error);
      }
    }
  }

  const summary = {
    collections: Object.keys(results).length,
    totalRecords: Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
  };

  return { 
    data: results, 
    summary, 
    charts: {} 
  };
}

// ==================== REPORT FILE GENERATION ====================

/**
 * Generate report file
 */
async function generateReportFile(report, data, summary, charts) {
  const timestamp = Date.now();
  const filename = `${report.name.replace(/\s+/g, '_')}_${timestamp}`;
  let filePath, fileUrl, size;

  switch(report.format) {
    case 'pdf':
      ({ filePath, filename: pdfName, size } = await generatePDF(report, data, summary, charts));
      fileUrl = `/uploads/reports/${pdfName}`;
      break;

    case 'csv':
      ({ filePath, filename: csvName, size } = await generateCSV(report, data));
      fileUrl = `/uploads/reports/${csvName}`;
      break;

    case 'excel':
      ({ filePath, filename: excelName, size } = await generateExcel(report, data, summary, charts));
      fileUrl = `/uploads/reports/${excelName}`;
      break;

    case 'json':
      ({ filePath, filename: jsonName, size } = await generateJSON(report, data, summary, charts));
      fileUrl = `/uploads/reports/${jsonName}`;
      break;

    default:
      throw new Error(`Unsupported format: ${report.format}`);
  }

  return {
    url: fileUrl,
    size,
    filename: path.basename(filePath),
    path: filePath
  };
}

/**
 * Generate PDF report
 */
async function generatePDF(report, data, summary, charts) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const filename = `${report.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, '../../../uploads/reports', filename);
  
  // Ensure directory exists
  const dir = path.join(__dirname, '../../../uploads/reports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text('InfluenceX Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(report.name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
  doc.text(`Type: ${report.type}`);
  doc.text(`Period: ${new Date(report.config.dateRange?.start).toLocaleDateString()} - ${new Date(report.config.dateRange?.end).toLocaleDateString()}`);
  doc.moveDown();

  // Summary
  if (summary && Object.keys(summary).length > 0) {
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);

    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value === 'number') {
        doc.fontSize(12).text(`${key}: ${value.toLocaleString()}`);
      } else {
        doc.fontSize(12).text(`${key}: ${value}`);
      }
    });
    doc.moveDown();
  }

  // Data table
  if (data && data.length > 0) {
    doc.fontSize(14).text('Data', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    const headers = Object.keys(data[0] || {}).slice(0, 8); // Limit to 8 columns
    const columnWidth = 500 / headers.length;

    let y = doc.y;
    headers.forEach((header, i) => {
      doc.fontSize(10).text(header, 50 + (i * columnWidth), y, { width: columnWidth - 10 });
    });
    doc.moveDown();

    // Table rows (first 20 rows)
    data.slice(0, 20).forEach((row, rowIndex) => {
      y = doc.y;
      headers.forEach((header, i) => {
        const value = row[header];
        let displayValue = value;
        
        if (value instanceof Date) {
          displayValue = value.toLocaleDateString();
        } else if (typeof value === 'object' && value !== null) {
          displayValue = JSON.stringify(value).substring(0, 20);
        } else if (value === null || value === undefined) {
          displayValue = '';
        } else {
          displayValue = String(value);
        }

        doc.fontSize(8).text(displayValue, 50 + (i * columnWidth), y, {
          width: columnWidth - 10,
          ellipsis: true
        });
      });
      doc.moveDown();
    });

    if (data.length > 20) {
      doc.fontSize(10).text(`... and ${data.length - 20} more rows`, 50, doc.y);
    }
  }

  // Footer
  doc.fontSize(8).text(
    `Generated by InfluenceX on ${new Date().toLocaleString()}`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(filePath);

  return {
    filePath,
    filename,
    size: stats.size
  };
}

/**
 * Generate CSV report
 */
async function generateCSV(report, data) {
  const filename = `${report.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  const filePath = path.join(__dirname, '../../../uploads/reports', filename);
  
  const dir = path.join(__dirname, '../../../uploads/reports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let csv = '';

  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    csv += headers.join(',') + '\n';
    
    data.forEach(row => {
      csv += headers.map(h => {
        let value = row[h];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).includes(',') ? `"${value}"` : value;
      }).join(',') + '\n';
    });
  }

  fs.writeFileSync(filePath, csv);
  const stats = fs.statSync(filePath);

  return {
    filePath,
    filename,
    size: stats.size
  };
}

/**
 * Generate Excel report
 */
async function generateExcel(report, data, summary, charts) {
  const filename = `${report.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  const filePath = path.join(__dirname, '../../../uploads/reports', filename);
  
  const dir = path.join(__dirname, '../../../uploads/reports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = new Excel.Workbook();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Report Summary']);
  summarySheet.addRow([]);
  
  Object.entries(summary).forEach(([key, value]) => {
    summarySheet.addRow([key, value]);
  });

  // Data sheet
  if (data && data.length > 0) {
    const dataSheet = workbook.addWorksheet('Data');
    
    const headers = Object.keys(data[0]);
    dataSheet.addRow(headers);
    
    data.forEach(row => {
      dataSheet.addRow(headers.map(h => row[h]));
    });
  }

  // Charts sheet (simplified - just chart data)
  if (charts && Object.keys(charts).length > 0) {
    const chartsSheet = workbook.addWorksheet('Charts');
    
    Object.entries(charts).forEach(([name, chart]) => {
      chartsSheet.addRow([name]);
      chartsSheet.addRow(['Label', 'Value']);
      
      if (chart.data) {
        chart.data.forEach(item => {
          if (item.label && item.value) {
            chartsSheet.addRow([item.label, item.value]);
          }
        });
      }
      
      chartsSheet.addRow([]);
    });
  }

  await workbook.xlsx.writeFile(filePath);
  const stats = fs.statSync(filePath);

  return {
    filePath,
    filename,
    size: stats.size
  };
}

/**
 * Generate JSON report
 */
async function generateJSON(report, data, summary, charts) {
  const filename = `${report.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  const filePath = path.join(__dirname, '../../../uploads/reports', filename);
  
  const dir = path.join(__dirname, '../../../uploads/reports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const jsonData = {
    report: {
      id: report._id,
      name: report.name,
      type: report.type,
      generatedAt: new Date(),
      period: report.config.dateRange
    },
    summary,
    data,
    charts
  };

  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  const stats = fs.statSync(filePath);

  return {
    filePath,
    filename,
    size: stats.size
  };
}

// ==================== REPORT MANAGEMENT ====================

/**
 * Get all reports
 * @route GET /api/admin/reports
 * @access Private/Admin
 */
exports.getReports = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('userId', 'fullName email')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reports'
    });
  }
};

/**
 * Get single report
 * @route GET /api/admin/reports/:reportId
 * @access Private/Admin
 */
exports.getReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate('userId', 'fullName email')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get report'
    });
  }
};

/**
 * Delete report
 * @route DELETE /api/admin/reports/:reportId
 * @access Private/Admin
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Delete file if exists
    if (report.fileUrl) {
      const filePath = path.join(__dirname, '../../../uploads/reports', path.basename(report.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await report.deleteOne();

    // Log action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'report_deleted',
      targetResource: {
        type: 'report',
        id: report._id
      },
      metadata: { name: report.name, type: report.type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete report'
    });
  }
};

/**
 * Download report
 * @route GET /api/admin/reports/:reportId/download
 * @access Private/Admin
 */
exports.downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'json' } = req.query;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // If file exists, serve it
    if (report.fileUrl && report.format === format) {
      const filePath = path.join(__dirname, '../../../uploads/reports', path.basename(report.fileUrl));
      
      if (fs.existsSync(filePath)) {
        return res.download(filePath);
      }
    }

    // Otherwise, generate file on demand
    let data = report.data || [];
    let summary = report.summary || {};
    let charts = report.charts || {};

    // If data is not loaded, fetch it
    if (!report.data && report.type) {
      const result = await regenerateReportData(report);
      data = result.data;
      summary = result.summary;
      charts = result.charts;
    }

    let fileInfo;

    switch(format) {
      case 'pdf':
        fileInfo = await generatePDF(report, data, summary, charts);
        break;
      case 'csv':
        fileInfo = await generateCSV(report, data);
        break;
      case 'excel':
        fileInfo = await generateExcel(report, data, summary, charts);
        break;
      case 'json':
        fileInfo = await generateJSON(report, data, summary, charts);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported format'
        });
    }

    // Log download
    await AuditLog.create({
      adminId: req.user._id,
      action: 'report_downloaded',
      targetResource: {
        type: 'report',
        id: report._id
      },
      metadata: { format, filename: fileInfo.filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.download(fileInfo.filePath, fileInfo.filename);

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download report'
    });
  }
};

/**
 * Regenerate report data
 */
async function regenerateReportData(report) {
  switch(report.type) {
    case 'users':
      return generateUserReport(report);
    case 'campaigns':
      return generateCampaignReport(report);
    case 'deals':
      return generateDealReport(report);
    case 'payments':
      return generatePaymentReport(report);
    case 'revenue':
      return generateRevenueReport(report);
    case 'engagement':
      return generateEngagementReport(report);
    case 'creators':
      return generateCreatorReport(report);
    case 'brands':
      return generateBrandReport(report);
    default:
      return { data: [], summary: {}, charts: {} };
  }
}

// ==================== SCHEDULED REPORTS ====================

/**
 * Schedule report
 * @route POST /api/admin/reports/:reportId/schedule
 * @access Private/Admin
 */
exports.scheduleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { frequency, recipients, time = '00:00', timezone = 'UTC' } = req.body;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Calculate next run
    const nextRun = calculateNextRun(frequency, time, timezone);

    report.isScheduled = true;
    report.schedule = {
      frequency,
      recipients,
      time,
      timezone,
      nextRun,
      lastRun: null
    };

    await report.save();

    // Log action
    await AuditLog.create({
      adminId: req.user._id,
      action: 'report_scheduled',
      targetResource: {
        type: 'report',
        id: report._id
      },
      metadata: { frequency, recipients },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Report scheduled successfully',
      report
    });

  } catch (error) {
    console.error('Schedule report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule report'
    });
  }
};

/**
 * Unschedule report
 * @route POST /api/admin/reports/:reportId/unschedule
 * @access Private/Admin
 */
exports.unscheduleReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    report.isScheduled = false;
    report.schedule = undefined;
    await report.save();

    res.json({
      success: true,
      message: 'Report unscheduled successfully'
    });

  } catch (error) {
    console.error('Unschedule report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unschedule report'
    });
  }
};

/**
 * Get scheduled reports
 * @route GET /api/admin/reports/scheduled/all
 * @access Private/Admin
 */
exports.getScheduledReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, frequency } = req.query;

    const query = { isScheduled: true };
    if (frequency) query['schedule.frequency'] = frequency;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('userId', 'fullName email')
        .sort({ 'schedule.nextRun': 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scheduled reports'
    });
  }
};

// ==================== REPORT TEMPLATES ====================

/**
 * Get report templates
 * @route GET /api/admin/reports/templates/all
 * @access Private/Admin
 */
exports.getReportTemplates = async (req, res) => {
  try {
    const ReportTemplate = require('../../models/ReportTemplate');
    
    const templates = await ReportTemplate.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get report templates'
    });
  }
};

/**
 * Create report template
 * @route POST /api/admin/reports/templates
 * @access Private/Admin
 */
exports.createReportTemplate = async (req, res) => {
  try {
    const { name, description, config, isDefault } = req.body;

    const ReportTemplate = require('../../models/ReportTemplate');

    // If this is default, unset other defaults
    if (isDefault) {
      await ReportTemplate.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const template = await ReportTemplate.create({
      name,
      description,
      config,
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('Create report template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create template'
    });
  }
};

/**
 * Update report template
 * @route PUT /api/admin/reports/templates/:templateId
 * @access Private/Admin
 */
exports.updateReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    const ReportTemplate = require('../../models/ReportTemplate');
    
    const template = await ReportTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // If setting as default, unset other defaults
    if (updates.isDefault && !template.isDefault) {
      await ReportTemplate.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(template, updates);
    template.updatedBy = req.user._id;
    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('Update report template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update template'
    });
  }
};

/**
 * Delete report template
 * @route DELETE /api/admin/reports/templates/:templateId
 * @access Private/Admin
 */
exports.deleteReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const ReportTemplate = require('../../models/ReportTemplate');
    
    const template = await ReportTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Soft delete
    template.isActive = false;
    template.deletedBy = req.user._id;
    template.deletedAt = new Date();
    await template.save();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete report template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete template'
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate next run date for scheduled report
 */
function calculateNextRun(frequency, time, timezone) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    }
  } else if (frequency === 'monthly') {
    nextRun.setMonth(nextRun.getMonth() + 1);
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  return nextRun;
}

/**
 * Group data by time period
 */
function groupDataBy(data, groupBy, dateField, valueField = null) {
  const grouped = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key;

    switch(groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      default:
        key = groupBy;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        count: 0,
        total: 0
      };
    }

    grouped[key].count++;
    if (valueField && item[valueField]) {
      grouped[key].total += item[valueField];
    }
  });

  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Calculate average completion time for deals
 */
function calculateAvgCompletionTime(deals) {
  const completedDeals = deals.filter(d => d.completedAt && d.createdAt);
  
  if (completedDeals.length === 0) return 0;

  const totalDays = completedDeals.reduce((sum, d) => {
    const days = (new Date(d.completedAt) - new Date(d.createdAt)) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return totalDays / completedDeals.length;
}

/**
 * Get color for status
 */
function getStatusColor(status) {
  const colors = {
    active: '#10B981',
    pending: '#F59E0B',
    completed: '#3B82F6',
    draft: '#6B7280',
    paused: '#EF4444',
    archived: '#8B5CF6',
    rejected: '#EF4444'
  };
  return colors[status] || '#6B7280';
}

/**
 * Get color for deal status
 */
function getDealStatusColor(status) {
  const colors = {
    pending: '#F59E0B',
    accepted: '#10B981',
    declined: '#EF4444',
    'in-progress': '#3B82F6',
    completed: '#8B5CF6',
    cancelled: '#6B7280',
    disputed: '#EF4444',
    revision: '#F59E0B',
    negotiating: '#EC4899'
  };
  return colors[status] || '#6B7280';
}

/**
 * Get color for payment
 */
function getPaymentColor(index) {
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  return colors[index % colors.length];
}

/**
 * Get color for payment method
 */
function getMethodColor(method) {
  const colors = {
    credit_card: '#4F46E5',
    paypal: '#003087',
    bank_account: '#10B981',
    stripe: '#635BFF',
    wire_transfer: '#F59E0B',
    crypto: '#8B5CF6'
  };
  return colors[method] || '#6B7280';
}

/**
 * Get color for industry
 */
function getIndustryColor(index) {
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];
  return colors[index % colors.length];
}

module.exports = exports;