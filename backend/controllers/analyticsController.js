// controllers/analyticsController.js - COMPLETE FIXED VERSION WITH EXPORTS
const Analytics = require('../models/Analytics');
const Report = require('../models/Report');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Creator = require('../models/Creator');
const Brand = require('../models/Brand');
const analyticsService = require('../services/analyticsService');
const csvGenerator = require('../utils/csvGenerator');
const asyncHandler = require('express-async-handler');
const cron = require('node-cron');
const mongoose = require('mongoose');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { period = 'today' } = req.query;

  let date = new Date();
  let analytics;

  switch (period) {
    case 'today':
      analytics = await Analytics.findOne({ 
        period: 'daily', 
        date: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      });
      break;
      
    case 'week':
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      analytics = await Analytics.findOne({ 
        period: 'weekly',
        startDate: { $lte: new Date() },
        endDate: { $gte: weekStart }
      });
      break;
      
    case 'month':
      analytics = await Analytics.findOne({ 
        period: 'monthly',
        date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
      });
      break;
      
    default:
      analytics = await Analytics.findOne({ period: 'daily' }).sort({ date: -1 });
  }

  if (!analytics) {
    // Generate on-demand
    analytics = await analyticsService.generateDailyAnalytics();
  }

  // Add ROI calculations
  const roiData = await analyticsService.calculatePlatformROI(period);

  res.json({
    success: true,
    analytics: {
      ...analytics.toObject(),
      roi: roiData
    }
  });
});

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private/Admin
const getUserAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day', export: exportFormat } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const users = await User.find(query).select('userType createdAt status isVerified location');

  // Group by time period
  const groupedData = {};
  users.forEach(user => {
    let key;
    const date = new Date(user.createdAt);
    
    if (groupBy === 'hour') {
      key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
    } else if (groupBy === 'day') {
      key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        date: key,
        total: 0,
        brands: 0,
        creators: 0,
        verified: 0,
        active: 0
      };
    }
    
    groupedData[key].total++;
    if (user.userType === 'brand') groupedData[key].brands++;
    else groupedData[key].creators++;
    if (user.isVerified) groupedData[key].verified++;
    if (user.status === 'active') groupedData[key].active++;
  });

  // Convert to array for response
  const timeSeries = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

  // Location breakdown
  const locationBreakdown = {};
  users.forEach(user => {
    if (user.location) {
      const country = user.location.country || 'Unknown';
      locationBreakdown[country] = (locationBreakdown[country] || 0) + 1;
    }
  });

  const locations = Object.entries(locationBreakdown)
    .map(([country, count]) => ({ country, count, percentage: (count / users.length) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const result = {
    summary: {
      total: users.length,
      brands: users.filter(u => u.userType === 'brand').length,
      creators: users.filter(u => u.userType === 'creator').length,
      verified: users.filter(u => u.isVerified).length,
      active: users.filter(u => u.status === 'active').length,
      growth: await calculateGrowthRate('user')
    },
    timeSeries,
    locations
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = timeSeries.map(item => ({
      Date: item.date,
      'Total Users': item.total,
      Brands: item.brands,
      Creators: item.creators,
      Verified: item.verified,
      Active: item.active
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get campaign analytics
// @route   GET /api/analytics/campaigns
// @access  Private/Admin
const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day', export: exportFormat } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const campaigns = await Campaign.find(query)
    .populate('brandId', 'brandName industry')
    .select('title status budget category createdAt spent');

  // Group by status
  const byStatus = {};
  campaigns.forEach(campaign => {
    byStatus[campaign.status] = (byStatus[campaign.status] || 0) + 1;
  });

  // Group by category
  const byCategory = {};
  campaigns.forEach(campaign => {
    byCategory[campaign.category] = (byCategory[campaign.category] || 0) + 1;
  });

  // Time series
  const timeSeries = {};
  campaigns.forEach(campaign => {
    const date = new Date(campaign.createdAt);
    const key = groupBy === 'day' 
      ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      : `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!timeSeries[key]) {
      timeSeries[key] = {
        date: key,
        count: 0,
        totalBudget: 0,
        spent: 0
      };
    }
    
    timeSeries[key].count++;
    timeSeries[key].totalBudget += campaign.budget || 0;
    timeSeries[key].spent += campaign.spent || 0;
  });

  // Calculate ROI per campaign
  const campaignROI = await Promise.all(
    campaigns.slice(0, 10).map(async (campaign) => {
      const roi = await analyticsService.calculateCampaignROI(campaign._id);
      return {
        id: campaign._id,
        title: campaign.title,
        brand: campaign.brandId?.brandName,
        ...roi
      };
    })
  );

  const result = {
    summary: {
      total: campaigns.length,
      byStatus,
      byCategory,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
      averageROI: campaignROI.reduce((sum, c) => sum + c.roi, 0) / campaignROI.length || 0
    },
    timeSeries: Object.values(timeSeries).sort((a, b) => a.date.localeCompare(b.date)),
    topCampaigns: campaignROI.sort((a, b) => b.roi - a.roi)
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = result.topCampaigns.map(c => ({
      'Campaign Title': c.title,
      Brand: c.brand,
      'Total Spend': c.totalSpent,
      'Total Revenue': c.totalRevenue,
      'ROI %': c.roi.toFixed(2),
      'Engagement': c.totalEngagement,
      'Conversions': c.conversions
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaign-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get financial analytics
// @route   GET /api/analytics/financial
// @access  Private/Admin
const getFinancialAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day', export: exportFormat } = req.query;

  const query = { status: 'completed' };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query);

  // Calculate metrics
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalFees = payments.reduce((sum, p) => sum + p.fee, 0);
  const totalNet = payments.reduce((sum, p) => sum + p.netAmount, 0);

  // Group by payment type
  const byType = {};
  payments.forEach(p => {
    byType[p.type] = (byType[p.type] || 0) + p.amount;
  });

  // Time series
  const timeSeries = {};
  payments.forEach(payment => {
    const date = new Date(payment.createdAt);
    const key = groupBy === 'day' 
      ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      : `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!timeSeries[key]) {
      timeSeries[key] = {
        date: key,
        revenue: 0,
        fees: 0,
        net: 0,
        count: 0
      };
    }
    
    timeSeries[key].revenue += payment.amount;
    timeSeries[key].fees += payment.fee;
    timeSeries[key].net += payment.netAmount;
    timeSeries[key].count++;
  });

  // Monthly comparison
  const monthlyComparison = await analyticsService.getMonthlyComparison();

  const result = {
    summary: {
      totalRevenue,
      totalFees,
      totalNet,
      transactionCount: payments.length,
      avgTransactionValue: payments.length > 0 ? totalRevenue / payments.length : 0,
      growth: await calculateGrowthRate('revenue'),
      byType
    },
    timeSeries: Object.values(timeSeries).sort((a, b) => a.date.localeCompare(b.date)),
    monthlyComparison
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = Object.values(timeSeries).map(t => ({
      Date: t.date,
      Revenue: t.revenue,
      Fees: t.fees,
      'Net Revenue': t.net,
      Transactions: t.count
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get engagement analytics
// @route   GET /api/analytics/engagement
// @access  Private/Admin
const getEngagementAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, export: exportFormat } = req.query;

  const query = { status: 'completed' };
  if (startDate || endDate) {
    query.completedAt = {};
    if (startDate) query.completedAt.$gte = new Date(startDate);
    if (endDate) query.completedAt.$lte = new Date(endDate);
  }

  const deals = await Deal.find(query).populate('deliverables');

  let totalImpressions = 0;
  let totalEngagement = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  const platformData = {};

  deals.forEach(deal => {
    deal.deliverables?.forEach(del => {
      const platform = del.platform || 'other';
      
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

      const views = del.metrics?.views || 0;
      const likes = del.metrics?.likes || 0;
      const comments = del.metrics?.comments || 0;
      const shares = del.metrics?.shares || 0;
      const clicks = del.metrics?.clicks || 0;
      const conversions = del.metrics?.conversions || 0;

      totalImpressions += views;
      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;
      totalClicks += clicks;
      totalConversions += conversions;

      platformData[platform].impressions += views;
      platformData[platform].likes += likes;
      platformData[platform].comments += comments;
      platformData[platform].shares += shares;
      platformData[platform].clicks += clicks;
      platformData[platform].conversions += conversions;
      platformData[platform].spend += del.budget || 0;
    });
  });

  totalEngagement = totalLikes + totalComments + totalShares;

  const result = {
    summary: {
      totalImpressions,
      totalEngagement,
      totalLikes,
      totalComments,
      totalShares,
      totalClicks,
      totalConversions,
      avgEngagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgConversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      totalDeals: deals.length
    },
    byPlatform: Object.entries(platformData).map(([platform, metrics]) => ({
      platform,
      ...metrics,
      engagementRate: metrics.impressions > 0 
        ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions) * 100 
        : 0,
      ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
      cpe: metrics.impressions > 0 ? metrics.spend / metrics.impressions : 0,
      cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0
    }))
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = result.byPlatform.map(p => ({
      Platform: p.platform,
      Impressions: p.impressions,
      Likes: p.likes,
      Comments: p.comments,
      Shares: p.shares,
      Clicks: p.clicks,
      Conversions: p.conversions,
      'Engagement Rate %': p.engagementRate.toFixed(2),
      'CTR %': p.ctr.toFixed(2),
      'CPE $': p.cpe.toFixed(2),
      'CPC $': p.cpc.toFixed(2)
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=engagement-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get creator performance
// @route   GET /api/analytics/creators
// @access  Private/Admin
const getCreatorAnalytics = asyncHandler(async (req, res) => {
  const { limit = 10, sortBy = 'earnings', export: exportFormat } = req.query;

  const creators = await Creator.find({})
    .select('displayName handle totalFollowers averageEngagement stats profilePicture')
    .lean();

  // Get deal data for each creator
  const creatorPerformance = await Promise.all(
    creators.map(async (creator) => {
      const deals = await Deal.find({
        creatorId: creator._id,
        status: 'completed'
      });

      const totalEarnings = deals.reduce((sum, d) => sum + (d.netAmount || 0), 0);
      const totalDeals = deals.length;
      const avgDealValue = totalDeals > 0 ? totalEarnings / totalDeals : 0;
      
      // Calculate engagement from deals
      let totalEngagement = 0;
      deals.forEach(deal => {
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
        }
      });

      return {
        id: creator._id,
        name: creator.displayName,
        handle: creator.handle,
        profilePicture: creator.profilePicture,
        earnings: totalEarnings,
        deals: totalDeals,
        avgDealValue,
        followers: creator.totalFollowers || 0,
        engagement: creator.averageEngagement || 0,
        totalEngagement,
        rating: creator.stats?.averageRating || 0
      };
    })
  );

  // Sort by specified field
  const sorted = creatorPerformance.sort((a, b) => {
    if (sortBy === 'earnings') return b.earnings - a.earnings;
    if (sortBy === 'deals') return b.deals - a.deals;
    if (sortBy === 'followers') return b.followers - a.followers;
    if (sortBy === 'engagement') return b.engagement - a.engagement;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const result = {
    topPerformers: sorted.slice(0, parseInt(limit)),
    summary: {
      totalCreators: creators.length,
      totalEarnings: sorted.reduce((sum, c) => sum + c.earnings, 0),
      totalDeals: sorted.reduce((sum, c) => sum + c.deals, 0),
      avgEngagement: sorted.reduce((sum, c) => sum + c.engagement, 0) / creators.length,
      avgRating: sorted.reduce((sum, c) => sum + c.rating, 0) / creators.length
    }
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = result.topPerformers.map(c => ({
      Name: c.name,
      Handle: c.handle,
      Followers: c.followers,
      'Engagement %': c.engagement.toFixed(2),
      Deals: c.deals,
      'Total Earnings': c.earnings,
      'Avg Deal Value': c.avgDealValue,
      Rating: c.rating
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=creator-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get brand performance
// @route   GET /api/analytics/brands
// @access  Private/Admin
const getBrandAnalytics = asyncHandler(async (req, res) => {
  const { limit = 10, sortBy = 'spent', export: exportFormat } = req.query;

  const brands = await Brand.find({})
    .select('brandName industry logo stats')
    .lean();

  // Get campaign and deal data for each brand
  const brandPerformance = await Promise.all(
    brands.map(async (brand) => {
      const campaigns = await Campaign.find({ brandId: brand._id });
      const deals = await Deal.find({
        brandId: brand._id,
        status: 'completed'
      });

      const totalSpent = deals.reduce((sum, d) => sum + (d.budget || 0), 0);
      const totalDeals = deals.length;
      const totalCampaigns = campaigns.length;
      const avgDealValue = totalDeals > 0 ? totalSpent / totalDeals : 0;

      // Calculate ROI
      let totalRevenue = 0;
      let totalEngagement = 0;
      deals.forEach(deal => {
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
          totalRevenue += (deal.metrics.conversions || 0) * 50; // Estimate
        }
      });

      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

      return {
        id: brand._id,
        name: brand.brandName,
        logo: brand.logo,
        industry: brand.industry,
        spent: totalSpent,
        deals: totalDeals,
        campaigns: totalCampaigns,
        avgDealValue,
        revenue: totalRevenue,
        engagement: totalEngagement,
        roi,
        creators: brand.stats?.totalCreators || 0,
        rating: brand.stats?.averageRating || 0
      };
    })
  );

  // Sort by specified field
  const sorted = brandPerformance.sort((a, b) => {
    if (sortBy === 'spent') return b.spent - a.spent;
    if (sortBy === 'deals') return b.deals - a.deals;
    if (sortBy === 'campaigns') return b.campaigns - a.campaigns;
    if (sortBy === 'roi') return b.roi - a.roi;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const result = {
    topSpenders: sorted.slice(0, parseInt(limit)),
    summary: {
      totalBrands: brands.length,
      totalSpent: sorted.reduce((sum, b) => sum + b.spent, 0),
      totalDeals: sorted.reduce((sum, b) => sum + b.deals, 0),
      totalCampaigns: sorted.reduce((sum, b) => sum + b.campaigns, 0),
      avgROI: sorted.reduce((sum, b) => sum + b.roi, 0) / sorted.length
    }
  };

  // Handle export
  if (exportFormat === 'csv') {
    const csvData = result.topSpenders.map(b => ({
      Brand: b.name,
      Industry: b.industry,
      'Total Spent': b.spent,
      Campaigns: b.campaigns,
      Deals: b.deals,
      'Avg Deal Value': b.avgDealValue,
      Revenue: b.revenue,
      'ROI %': b.roi.toFixed(2),
      Rating: b.rating
    }));

    const csv = csvGenerator.generateCSV(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=brand-analytics.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get platform health
// @route   GET /api/analytics/health
// @access  Private/Admin
const getPlatformHealth = asyncHandler(async (req, res) => {
  const metrics = await analyticsService.getPlatformMetrics();

  // Get error rates from logs
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errorRate = await calculateErrorRate(last24h);

  // Get active users in last 24 hours
  const activeUsers = await User.countDocuments({ lastLogin: { $gte: last24h } });

  // Get API response times
  const responseTime = await getAverageResponseTime();

  // Get system load
  const systemLoad = process.cpuUsage();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    data: {
      ...metrics,
      activeUsers,
      errorRate: parseFloat(errorRate.toFixed(2)),
      responseTime: parseFloat(responseTime.toFixed(2)),
      status: errorRate < 1 ? 'healthy' : 'degraded',
      system: {
        cpu: systemLoad,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
        },
        uptime: process.uptime() / 3600 + ' hours'
      }
    }
  });
});

// @desc    Get ROI analytics
// @route   GET /api/analytics/roi
// @access  Private/Admin
const getROIAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', campaignId, brandId } = req.query;

  let roiData;

  if (campaignId) {
    roiData = await analyticsService.calculateCampaignROI(campaignId);
  } else if (brandId) {
    roiData = await analyticsService.calculateBrandROI(brandId, period);
  } else {
    roiData = await analyticsService.calculatePlatformROI(period);
  }

  res.json({
    success: true,
    data: roiData
  });
});

// @desc    Get export formats
// @route   GET /api/analytics/export-formats
// @access  Private/Admin
const getExportFormats = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    formats: [
      { id: 'csv', name: 'CSV', extension: '.csv' },
      { id: 'json', name: 'JSON', extension: '.json' },
      { id: 'excel', name: 'Excel', extension: '.xlsx' },
      { id: 'pdf', name: 'PDF', extension: '.pdf' }
    ]
  });
});

// @desc    Create report
// @route   POST /api/analytics/reports
// @access  Private/Admin
const createReport = asyncHandler(async (req, res) => {
  const reportConfig = req.body;

  const report = await analyticsService.generateReport(req.user._id, reportConfig);

  res.status(201).json({
    success: true,
    report
  });
});

// @desc    Get all reports
// @route   GET /api/analytics/reports
// @access  Private/Admin
const getReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const reports = await Report.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Report.countDocuments({ userId: req.user._id });

  res.json({
    success: true,
    reports,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// @desc    Get single report
// @route   GET /api/analytics/reports/:reportId
// @access  Private/Admin
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({
    _id: req.params.reportId,
    userId: req.user._id
  });

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  res.json({
    success: true,
    report
  });
});

// @desc    Export report
// @route   GET /api/analytics/reports/:reportId/export
// @access  Private/Admin
const exportReport = asyncHandler(async (req, res) => {
  const { format = 'pdf' } = req.query;

  const result = await analyticsService.exportReport(req.params.reportId, format);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.data);
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.json(result.data);
  }

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.data);
  }

  res.json(result);
});

// @desc    Delete report
// @route   DELETE /api/analytics/reports/:reportId
// @access  Private/Admin
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findOneAndDelete({
    _id: req.params.reportId,
    userId: req.user._id
  });

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  res.json({
    success: true,
    message: 'Report deleted successfully'
  });
});

// @desc    Schedule report
// @route   POST /api/analytics/reports/:reportId/schedule
// @access  Private/Admin
const scheduleReport = asyncHandler(async (req, res) => {
  const { frequency, recipients } = req.body;

  const report = await Report.findOne({
    _id: req.params.reportId,
    userId: req.user._id
  });

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  // Calculate next run
  const nextRun = new Date();
  if (frequency === 'daily') {
    nextRun.setDate(nextRun.getDate() + 1);
  } else if (frequency === 'weekly') {
    nextRun.setDate(nextRun.getDate() + 7);
  } else if (frequency === 'monthly') {
    nextRun.setMonth(nextRun.getMonth() + 1);
  }

  report.isScheduled = true;
  report.schedule = {
    frequency,
    nextRun,
    recipients,
    lastRun: null
  };
  await report.save();

  res.json({
    success: true,
    message: 'Report scheduled successfully',
    report
  });
});

// @desc    Unschedule report
// @route   POST /api/analytics/reports/:reportId/unschedule
// @access  Private/Admin
const unscheduleReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({
    _id: req.params.reportId,
    userId: req.user._id
  });

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  report.isScheduled = false;
  report.schedule = undefined;
  await report.save();

  res.json({
    success: true,
    message: 'Report unscheduled successfully'
  });
});

// ==================== HELPER FUNCTIONS ====================

async function calculateGrowthRate(type) {
  const now = new Date();
  const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
  const twoMonthsAgo = new Date(now.setMonth(now.getMonth() - 1));

  let currentCount, previousCount;

  if (type === 'user') {
    currentCount = await User.countDocuments({ createdAt: { $gte: lastMonth } });
    previousCount = await User.countDocuments({ 
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth } 
    });
  } else if (type === 'revenue') {
    const currentRevenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const previousRevenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: twoMonthsAgo, $lt: lastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    currentCount = currentRevenue[0]?.total || 0;
    previousCount = previousRevenue[0]?.total || 1;
  }

  return previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
}

async function calculateErrorRate(since) {
  // This would come from your logging system
  return 0.5;
}

async function getAverageResponseTime() {
  // This would come from your monitoring system
  return 245;
}

// Scheduled tasks
cron.schedule('0 0 * * *', async () => {
  console.log('📊 Generating daily analytics...');
  try {
    await analyticsService.generateDailyAnalytics();
  } catch (error) {
    console.error('Error generating daily analytics:', error);
  }
});

cron.schedule('0 0 * * 0', async () => {
  console.log('📊 Generating weekly analytics...');
  try {
    await analyticsService.generateWeeklyAnalytics();
  } catch (error) {
    console.error('Error generating weekly analytics:', error);
  }
});

cron.schedule('0 0 1 * *', async () => {
  console.log('📊 Generating monthly analytics...');
  try {
    await analyticsService.generateMonthlyAnalytics();
  } catch (error) {
    console.error('Error generating monthly analytics:', error);
  }
});

module.exports = {
  getDashboardAnalytics,
  getUserAnalytics,
  getCampaignAnalytics,
  getFinancialAnalytics,
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
  unscheduleReport
};