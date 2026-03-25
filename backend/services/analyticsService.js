const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Analytics = require('../models/Analytics');
const Report = require('../models/Report');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');

class AnalyticsService {
  
  // ==================== ROI CALCULATIONS ====================
  
  /**
   * Calculate ROI for a single campaign
   */
  async calculateCampaignROI(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      const deals = await Deal.find({ 
        campaignId, 
        status: 'completed' 
      }).populate('deliverables');

      let totalSpent = campaign.spent || 0;
      let totalRevenue = 0;
      let totalEngagement = 0;
      let totalConversions = 0;
      let totalImpressions = 0;

      deals.forEach(deal => {
        totalSpent += deal.budget || 0;
        
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
          totalConversions += deal.metrics.conversions || 0;
          totalImpressions += deal.metrics.impressions || 0;
          
          // Estimate revenue from conversions (placeholder - would need actual value)
          totalRevenue += (deal.metrics.conversions || 0) * 50; // $50 per conversion
        }

        // Add deliverable metrics
        deal.deliverables?.forEach(del => {
          if (del.performance) {
            totalEngagement += (del.performance.likes || 0) + 
                              (del.performance.comments || 0) + 
                              (del.performance.shares || 0);
            totalConversions += del.performance.conversions || 0;
            totalImpressions += del.performance.impressions || 0;
          }
        });
      });

      // Calculate ROI metrics
      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
      const cpe = totalEngagement > 0 ? totalSpent / totalEngagement : 0;
      const cpa = totalConversions > 0 ? totalSpent / totalConversions : 0;
      const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
      const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

      return {
        campaignId,
        campaignTitle: campaign.title,
        totalSpent,
        totalRevenue,
        totalEngagement,
        totalConversions,
        totalImpressions,
        roi: parseFloat(roi.toFixed(2)),
        cpe: parseFloat(cpe.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
        cpm: parseFloat(cpm.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        performance: {
          excellent: roi > 100,
          good: roi > 50,
          average: roi > 20,
          poor: roi <= 20
        }
      };
    } catch (error) {
      console.error('Campaign ROI calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate ROI for a brand
   */
  async calculateBrandROI(brandId, period = '30d') {
    try {
      let startDate = new Date();
      switch(period) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
        case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
      }

      const campaigns = await Campaign.find({ 
        brandId,
        createdAt: { $gte: startDate }
      });

      const deals = await Deal.find({
        brandId,
        status: 'completed',
        completedAt: { $gte: startDate }
      }).populate('deliverables');

      let totalSpent = 0;
      let totalRevenue = 0;
      let totalEngagement = 0;
      let totalConversions = 0;

      // Campaign spending
      campaigns.forEach(c => totalSpent += c.spent || 0);

      // Deal metrics
      deals.forEach(deal => {
        totalSpent += deal.budget || 0;
        
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
          totalConversions += deal.metrics.conversions || 0;
          totalRevenue += (deal.metrics.conversions || 0) * 50;
        }
      });

      // ROI by campaign
      const campaignROI = [];
      for (const c of campaigns) {
        const roi = await this.calculateCampaignROI(c._id);
        campaignROI.push(roi);
      }

      // Platform breakdown
      const platformBreakdown = {};
      deals.forEach(deal => {
        deal.deliverables?.forEach(del => {
          const platform = del.platform || 'other';
          if (!platformBreakdown[platform]) {
            platformBreakdown[platform] = { spend: 0, engagement: 0, conversions: 0 };
          }
          platformBreakdown[platform].spend += del.budget || 0;
          if (del.performance) {
            platformBreakdown[platform].engagement += (del.performance.likes || 0) + 
                                                     (del.performance.comments || 0) + 
                                                     (del.performance.shares || 0);
            platformBreakdown[platform].conversions += del.performance.conversions || 0;
          }
        });
      });

      return {
        brandId,
        period,
        summary: {
          totalSpent,
          totalRevenue,
          totalEngagement,
          totalConversions,
          roi: totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0,
          roas: totalSpent > 0 ? totalRevenue / totalSpent : 0,
          cpe: totalEngagement > 0 ? totalSpent / totalEngagement : 0,
          cpa: totalConversions > 0 ? totalSpent / totalConversions : 0
        },
        campaignROI: campaignROI.sort((a, b) => b.roi - a.roi),
        platformBreakdown,
        recommendations: this.generateROIRecommendations(campaignROI, platformBreakdown)
      };
    } catch (error) {
      console.error('Brand ROI calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate platform-wide ROI
   */
  async calculatePlatformROI(period = '30d') {
    try {
      let startDate = new Date();
      switch(period) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
        case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
      }

      const deals = await Deal.find({
        status: 'completed',
        completedAt: { $gte: startDate }
      }).populate('brandId creatorId');

      let totalSpend = 0;
      let totalRevenue = 0;
      let totalEngagement = 0;
      let totalConversions = 0;

      const industryROI = {};
      const platformROI = {};

      deals.forEach(deal => {
        totalSpend += deal.budget || 0;
        
        if (deal.metrics) {
          totalEngagement += (deal.metrics.likes || 0) + 
                            (deal.metrics.comments || 0) + 
                            (deal.metrics.shares || 0);
          totalConversions += deal.metrics.conversions || 0;
          totalRevenue += (deal.metrics.conversions || 0) * 50;
        }

        // Industry breakdown
        const industry = deal.brandId?.industry || 'Other';
        if (!industryROI[industry]) {
          industryROI[industry] = { spend: 0, revenue: 0, deals: 0 };
        }
        industryROI[industry].spend += deal.budget || 0;
        industryROI[industry].revenue += (deal.metrics?.conversions || 0) * 50;
        industryROI[industry].deals += 1;

        // Platform breakdown
        deal.deliverables?.forEach(del => {
          const platform = del.platform || 'other';
          if (!platformROI[platform]) {
            platformROI[platform] = { spend: 0, engagement: 0, conversions: 0 };
          }
          platformROI[platform].spend += del.budget || 0;
          if (del.performance) {
            platformROI[platform].engagement += (del.performance.likes || 0) + 
                                               (del.performance.comments || 0) + 
                                               (del.performance.shares || 0);
            platformROI[platform].conversions += del.performance.conversions || 0;
          }
        });
      });

      return {
        period,
        summary: {
          totalSpend,
          totalRevenue,
          totalEngagement,
          totalConversions,
          platformROI: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0,
          averageROAS: totalSpend > 0 ? totalRevenue / totalSpend : 0,
          averageCPE: totalEngagement > 0 ? totalSpend / totalEngagement : 0,
          averageCPA: totalConversions > 0 ? totalSpend / totalConversions : 0
        },
        industryROI: Object.entries(industryROI).map(([industry, data]) => ({
          industry,
          ...data,
          roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0
        })).sort((a, b) => b.roi - a.roi),
        platformROI: Object.entries(platformROI).map(([platform, data]) => ({
          platform,
          ...data,
          cpe: data.engagement > 0 ? data.spend / data.engagement : 0,
          cpc: data.conversions > 0 ? data.spend / data.conversions : 0
        }))
      };
    } catch (error) {
      console.error('Platform ROI calculation error:', error);
      throw error;
    }
  }

  /**
   * Generate ROI recommendations
   */
  generateROIRecommendations(campaignROI, platformBreakdown) {
    const recommendations = [];

    // Campaign performance
    const poorCampaigns = campaignROI.filter(c => c.roi < 20);
    if (poorCampaigns.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Low ROI Campaigns',
        message: `${poorCampaigns.length} campaigns have ROI below 20%. Review targeting and content strategy.`,
        campaigns: poorCampaigns.map(c => c.campaignTitle)
      });
    }

    const excellentCampaigns = campaignROI.filter(c => c.roi > 100);
    if (excellentCampaigns.length > 0) {
      recommendations.push({
        type: 'success',
        title: 'High Performing Campaigns',
        message: `${excellentCampaigns.length} campaigns are performing exceptionally well. Consider increasing budget.`,
        campaigns: excellentCampaigns.map(c => c.campaignTitle)
      });
    }

    // Platform performance
    Object.entries(platformBreakdown).forEach(([platform, data]) => {
      const cpe = data.engagement > 0 ? data.spend / data.engagement : 0;
      if (cpe > 0.10) { // $0.10 per engagement
        recommendations.push({
          type: 'info',
          title: `High CPE on ${platform}`,
          message: `${platform} has a high cost per engagement ($${cpe.toFixed(2)}). Consider optimizing content for this platform.`
        });
      }
    });

    return recommendations;
  }

  // ==================== MONTHLY COMPARISON ====================
  
  async getMonthlyComparison() {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [current, previous, older] = await Promise.all([
      this.getMonthlyStats(currentMonth),
      this.getMonthlyStats(lastMonth),
      this.getMonthlyStats(twoMonthsAgo)
    ]);

    return {
      current,
      previous,
      older,
      trends: {
        revenue: this.calculateTrend(current.revenue, previous.revenue),
        users: this.calculateTrend(current.newUsers, previous.newUsers),
        deals: this.calculateTrend(current.deals, previous.deals),
        engagement: this.calculateTrend(current.engagement, previous.engagement)
      }
    };
  }

  async getMonthlyStats(monthStart) {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    const [users, deals, payments, engagement] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Deal.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: monthStart, $lt: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      this.getMonthlyEngagement(monthStart, monthEnd)
    ]);

    return {
      month: monthStart.toLocaleString('default', { month: 'long' }),
      year: monthStart.getFullYear(),
      newUsers: users,
      deals,
      revenue: payments[0]?.total || 0,
      engagement
    };
  }

  async getMonthlyEngagement(start, end) {
    const deals = await Deal.find({
      status: 'completed',
      completedAt: { $gte: start, $lt: end }
    });

    let total = 0;
    deals.forEach(deal => {
      if (deal.metrics) {
        total += (deal.metrics.likes || 0) + 
                (deal.metrics.comments || 0) + 
                (deal.metrics.shares || 0);
      }
    });

    return total;
  }

  calculateTrend(current, previous) {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }

  // ==================== EXISTING METHODS ====================
  
  async generateDailyAnalytics(date = new Date()) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    try {
      const [
        userAnalytics,
        campaignAnalytics,
        dealAnalytics,
        paymentAnalytics,
        engagementAnalytics,
        creatorPerformance,
        brandPerformance,
        platformMetrics
      ] = await Promise.all([
        this.getUserAnalytics(startDate, endDate),
        this.getCampaignAnalytics(startDate, endDate),
        this.getDealAnalytics(startDate, endDate),
        this.getPaymentAnalytics(startDate, endDate),
        this.getEngagementAnalytics(startDate, endDate),
        this.getCreatorPerformance(startDate, endDate),
        this.getBrandPerformance(startDate, endDate),
        this.getPlatformMetrics()
      ]);

      const analytics = await Analytics.findOneAndUpdate(
        { period: 'daily', date: startDate },
        {
          period: 'daily',
          date: startDate,
          startDate,
          endDate,
          userAnalytics,
          campaignAnalytics,
          dealAnalytics,
          paymentAnalytics,
          engagementAnalytics,
          creatorPerformance,
          brandPerformance,
          platformMetrics
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Daily analytics generated for ${startDate.toDateString()}`);
      return analytics;
    } catch (error) {
      console.error('Error generating daily analytics:', error);
      throw error;
    }
  }

  async generateWeeklyAnalytics(date = new Date()) {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    return this.generateAggregatedAnalytics('weekly', startDate, endDate);
  }

  async generateMonthlyAnalytics(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return this.generateAggregatedAnalytics('monthly', startDate, endDate);
  }

  async generateAggregatedAnalytics(period, startDate, endDate) {
    const [
      userAnalytics,
      campaignAnalytics,
      dealAnalytics,
      paymentAnalytics,
      engagementAnalytics,
      creatorPerformance,
      brandPerformance,
      platformMetrics
    ] = await Promise.all([
      this.getUserAnalytics(startDate, endDate, true),
      this.getCampaignAnalytics(startDate, endDate, true),
      this.getDealAnalytics(startDate, endDate, true),
      this.getPaymentAnalytics(startDate, endDate, true),
      this.getEngagementAnalytics(startDate, endDate),
      this.getCreatorPerformance(startDate, endDate),
      this.getBrandPerformance(startDate, endDate),
      this.getPlatformMetrics()
    ]);

    const analytics = await Analytics.findOneAndUpdate(
      { period, startDate, endDate },
      {
        period,
        startDate,
        endDate,
        userAnalytics,
        campaignAnalytics,
        dealAnalytics,
        paymentAnalytics,
        engagementAnalytics,
        creatorPerformance,
        brandPerformance,
        platformMetrics
      },
      { upsert: true, new: true }
    );

    return analytics;
  }

  async getUserAnalytics(startDate, endDate, aggregated = false) {
    const [total, brands, creators, active, newUsers, verified] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: 'brand' }),
      User.countDocuments({ userType: 'creator' }),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ isVerified: true })
    ]);

    const previousPeriod = await User.countDocuments({
      createdAt: { $lt: startDate }
    });

    const growthRate = previousPeriod > 0 
      ? ((total - previousPeriod) / previousPeriod) * 100 
      : 0;

    return {
      total,
      brands,
      creators,
      active,
      newUsers,
      verified,
      suspended: await User.countDocuments({ status: 'suspended' }),
      growthRate: parseFloat(growthRate.toFixed(2)),
      demographics: await this.getUserDemographics()
    };
  }

  async getUserDemographics() {
    const users = await User.find({}, 'location gender birthday').lean();

    const countries = {};
    const ageGroups = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    const gender = { male: 0, female: 0, other: 0 };

    const now = new Date();
    users.forEach(user => {
      if (user.location?.country) {
        countries[user.location.country] = (countries[user.location.country] || 0) + 1;
      }
      
      if (user.gender) {
        gender[user.gender] = (gender[user.gender] || 0) + 1;
      }
      
      if (user.birthday) {
        const age = now.getFullYear() - new Date(user.birthday).getFullYear();
        if (age < 25) ageGroups['18-24']++;
        else if (age < 35) ageGroups['25-34']++;
        else if (age < 45) ageGroups['35-44']++;
        else if (age < 55) ageGroups['45-54']++;
        else ageGroups['55+']++;
      }
    });

    const total = users.length;
    return {
      countries: Object.entries(countries)
        .map(([name, count]) => ({ name, count, percentage: (count / total) * 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      ageGroups,
      gender
    };
  }

  async getCampaignAnalytics(startDate, endDate, aggregated = false) {
    const [total, active, completed, byCategory, byPlatform] = await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'completed' }),
      Campaign.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Campaign.aggregate([
        { $unwind: '$targetAudience.platforms' },
        {
          $group: {
            _id: '$targetAudience.platforms',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' }
          }
        }
      ])
    ]);

    const budgetStats = await Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$budget' },
          avgBudget: { $avg: '$budget' }
        }
      }
    ]);

    return {
      total,
      active,
      completed,
      draft: await Campaign.countDocuments({ status: 'draft' }),
      paused: await Campaign.countDocuments({ status: 'paused' }),
      pending: await Campaign.countDocuments({ status: 'pending' }),
      totalBudget: budgetStats[0]?.totalBudget || 0,
      avgBudget: budgetStats[0]?.avgBudget || 0,
      byCategory: byCategory.map(c => ({
        category: c._id,
        count: c.count,
        totalBudget: c.totalBudget
      })),
      byPlatform: byPlatform.map(p => ({
        platform: p._id,
        count: p.count,
        totalBudget: p.totalBudget
      }))
    };
  }

  async getDealAnalytics(startDate, endDate, aggregated = false) {
    const [total, completed, pending, inProgress, cancelled, disputed, financialStats, byStatus] = await Promise.all([
      Deal.countDocuments(),
      Deal.countDocuments({ status: 'completed' }),
      Deal.countDocuments({ status: 'pending' }),
      Deal.countDocuments({ status: 'in-progress' }),
      Deal.countDocuments({ status: 'cancelled' }),
      Deal.countDocuments({ status: 'disputed' }),
      Deal.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$budget' },
            avgValue: { $avg: '$budget' },
            totalFees: { $sum: '$platformFee' },
            avgFees: { $avg: '$platformFee' }
          }
        }
      ]),
      Deal.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: '$budget' }
          }
        }
      ])
    ]);

    // Calculate average ROI
    const roiData = await Deal.aggregate([
      { $match: { status: 'completed', 'metrics.conversions': { $exists: true } } },
      {
        $project: {
          roi: {
            $multiply: [
              {
                $divide: [
                  { $subtract: [{ $multiply: ['$metrics.conversions', 50] }, '$budget'] },
                  '$budget'
                ]
              },
              100
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgROI: { $avg: '$roi' }
        }
      }
    ]);

    const completionTime = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $exists: true }
        }
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$duration' }
        }
      }
    ]);

    return {
      total,
      completed,
      pending,
      inProgress,
      cancelled,
      disputed,
      totalValue: financialStats[0]?.totalValue || 0,
      avgValue: financialStats[0]?.avgValue || 0,
      totalFees: financialStats[0]?.totalFees || 0,
      avgFees: financialStats[0]?.avgFees || 0,
      avgCompletionTime: completionTime[0]?.avgCompletionTime || 0,
      avgROI: roiData[0]?.avgROI || 0,
      byStatus: byStatus.map(s => ({
        status: s._id,
        count: s.count,
        value: s.value
      }))
    };
  }

  async getPaymentAnalytics(startDate, endDate, aggregated = false) {
    const payments = await Payment.find({
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = payments.reduce((sum, p) => sum + p.fee, 0);
    const totalPayouts = payments.reduce((sum, p) => sum + p.netAmount, 0);

    const byMethod = {};
    payments.forEach(p => {
      const method = p.paymentMethod?.type || 'unknown';
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, volume: 0 };
      }
      byMethod[method].count++;
      byMethod[method].volume += p.amount;
    });

    const dailyRevenue = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayPayments = payments.filter(p => 
        p.createdAt >= dayStart && p.createdAt <= dayEnd
      );
      
      dailyRevenue.push({
        date: new Date(currentDate),
        amount: dayPayments.reduce((sum, p) => sum + p.amount, 0)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalRevenue,
      totalFees,
      totalPayouts,
      transactionCount: payments.length,
      avgTransactionValue: payments.length > 0 ? totalRevenue / payments.length : 0,
      successRate: 98.5,
      byMethod: Object.entries(byMethod).map(([method, data]) => ({
        method,
        count: data.count,
        volume: data.volume
      })),
      dailyRevenue,
      subscriptionRevenue: totalRevenue * 0.3,
      commissionRevenue: totalRevenue * 0.7
    };
  }

  async getEngagementAnalytics(startDate, endDate) {
    const deals = await Deal.find({
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    }).populate('deliverables').lean();

    let totalImpressions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    deals.forEach(deal => {
      deal.deliverables?.forEach(del => {
        totalImpressions += del.metrics?.views || 0;
        totalLikes += del.metrics?.likes || 0;
        totalComments += del.metrics?.comments || 0;
        totalShares += del.metrics?.shares || 0;
        totalClicks += del.metrics?.clicks || 0;
        totalConversions += del.metrics?.conversions || 0;
      });
    });

    const totalReach = totalImpressions * 0.7;
    const avgEngagementRate = totalImpressions > 0 
      ? ((totalLikes + totalComments + totalShares) / totalImpressions) * 100 
      : 0;

    return {
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      totalImpressions,
      totalReach,
      totalLikes,
      totalComments,
      totalShares,
      totalClicks,
      totalConversions,
      byPlatform: []
    };
  }

  async getCreatorPerformance(startDate, endDate) {
    const topCreators = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$creatorId',
          deals: { $sum: 1 },
          earnings: { $sum: '$netAmount' },
          avgBudget: { $avg: '$budget' }
        }
      },
      { $sort: { earnings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creatorInfo'
        }
      },
      {
        $project: {
          creatorId: '$_id',
          name: { $arrayElemAt: ['$creatorInfo.displayName', 0] },
          handle: { $arrayElemAt: ['$creatorInfo.handle', 0] },
          profilePicture: { $arrayElemAt: ['$creatorInfo.profilePicture', 0] },
          deals: 1,
          earnings: 1,
          avgBudget: 1
        }
      }
    ]);

    const creators = await Creator.find({}, 'totalFollowers stats.averageRating stats.totalEarnings').lean();
    
    const followerRanges = {
      '1k-10k': { count: 0, avgEngagement: 0, avgEarnings: 0 },
      '10k-50k': { count: 0, avgEngagement: 0, avgEarnings: 0 },
      '50k-100k': { count: 0, avgEngagement: 0, avgEarnings: 0 },
      '100k+': { count: 0, avgEngagement: 0, avgEarnings: 0 }
    };

    creators.forEach(creator => {
      const followers = creator.totalFollowers || 0;
      let range;
      
      if (followers < 10000) range = '1k-10k';
      else if (followers < 50000) range = '10k-50k';
      else if (followers < 100000) range = '50k-100k';
      else range = '100k+';
      
      followerRanges[range].count++;
      followerRanges[range].avgEngagement += creator.stats?.averageRating || 0;
      followerRanges[range].avgEarnings += creator.stats?.totalEarnings || 0;
    });

    Object.keys(followerRanges).forEach(range => {
      if (followerRanges[range].count > 0) {
        followerRanges[range].avgEngagement /= followerRanges[range].count;
        followerRanges[range].avgEarnings /= followerRanges[range].count;
      }
    });

    return {
      topPerformers: topCreators,
      followerRanges: Object.entries(followerRanges).map(([range, data]) => ({
        range,
        ...data
      }))
    };
  }

  async getBrandPerformance(startDate, endDate) {
    const topSpenders = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$brandId',
          totalSpent: { $sum: '$budget' },
          campaigns: { $sum: 1 },
          avgDealSize: { $avg: '$budget' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brandInfo'
        }
      },
      {
        $project: {
          brandId: '$_id',
          name: { $arrayElemAt: ['$brandInfo.brandName', 0] },
          logo: { $arrayElemAt: ['$brandInfo.logo', 0] },
          totalSpent: 1,
          campaigns: 1,
          avgDealSize: 1
        }
      }
    ]);

    const industries = await Brand.aggregate([
      {
        $lookup: {
          from: 'deals',
          localField: '_id',
          foreignField: 'brandId',
          as: 'deals'
        }
      },
      {
        $project: {
          industry: 1,
          deals: {
            $filter: {
              input: '$deals',
              as: 'deal',
              cond: { 
                $and: [
                  { $eq: ['$$deal.status', 'completed'] },
                  { $gte: ['$$deal.completedAt', startDate] },
                  { $lte: ['$$deal.completedAt', endDate] }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$industry',
          totalSpent: { $sum: { $sum: '$deals.budget' } },
          totalDeals: { $sum: { $size: '$deals' } },
          avgDealSize: { $avg: '$deals.budget' }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    return {
      topSpenders,
      industries: industries.map(i => ({
        name: i._id,
        totalSpent: i.totalSpent || 0,
        totalDeals: i.totalDeals || 0,
        avgDealSize: i.avgDealSize || 0
      }))
    };
  }

  async getPlatformMetrics() {
    const [activeSessions, apiCalls, storageUsed] = await Promise.all([
      this.getActiveSessions(),
      this.getDailyApiCalls(),
      this.getStorageUsed()
    ]);

    return {
      uptime: 99.9,
      avgResponseTime: 245,
      activeSessions,
      apiCalls,
      storageUsed,
      bandwidthUsed: 500
    };
  }

  async getActiveSessions() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return User.countDocuments({ lastActive: { $gte: fiveMinutesAgo } });
  }

  async getDailyApiCalls() {
    return 150000;
  }

  async getStorageUsed() {
    const [dealCount, messageCount] = await Promise.all([
      Deal.countDocuments(),
      mongoose.model('Message').countDocuments()
    ]);
    
    return (dealCount * 5) + (messageCount * 0.001);
  }

  // ==================== REPORT GENERATION ====================
  
  async generateReport(userId, reportConfig) {
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
      exportFormats
    } = reportConfig;

    const report = await Report.create({
      userId,
      type,
      name,
      description,
      config: {
        dateRange,
        filters,
        metrics,
        groupBy,
        sortBy,
        sortOrder
      },
      exportFormats,
      status: 'generating',
      progress: 0
    });

    try {
      let data;
      let summary = {};
      let charts = {};

      switch (type) {
        case 'user_activity':
          data = await this.getUserActivityData(dateRange, filters);
          summary = this.calculateSummary(data);
          charts = this.generateUserCharts(data);
          break;
          
        case 'campaign_performance':
          data = await this.getCampaignPerformanceData(dateRange, filters);
          summary = this.calculateCampaignSummary(data);
          charts = this.generateCampaignCharts(data);
          break;
          
        case 'financial':
          data = await this.getFinancialData(dateRange, filters);
          summary = this.calculateFinancialSummary(data);
          charts = this.generateFinancialCharts(data);
          break;
          
        case 'engagement':
          data = await this.getEngagementData(dateRange, filters);
          summary = this.calculateEngagementSummary(data);
          charts = this.generateEngagementCharts(data);
          break;

        case 'roi_analysis':
          data = await this.getROIData(dateRange, filters);
          summary = this.calculateROISummary(data);
          charts = this.generateROICharts(data);
          break;
      }

      report.data = data;
      report.summary = summary;
      report.charts = charts;
      report.status = 'completed';
      report.progress = 100;
      await report.save();

      return report;
    } catch (error) {
      report.status = 'failed';
      report.error = error.message;
      await report.save();
      throw error;
    }
  }

  async getROIData(dateRange, filters) {
    const query = { status: 'completed' };
    if (dateRange?.start || dateRange?.end) {
      query.completedAt = {};
      if (dateRange.start) query.completedAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.completedAt.$lte = new Date(dateRange.end);
    }

    const deals = await Deal.find(query)
      .populate('brandId', 'brandName industry')
      .populate('campaignId', 'title')
      .lean();

    const roiData = await Promise.all(
      deals.map(async deal => {
        const campaignROI = await this.calculateCampaignROI(deal.campaignId?._id);
        return {
          dealId: deal._id,
          campaign: deal.campaignId?.title,
          brand: deal.brandId?.brandName,
          industry: deal.brandId?.industry,
          spent: deal.budget,
          ...campaignROI
        };
      })
    );

    return roiData;
  }

  calculateROISummary(data) {
    const totalSpent = data.reduce((sum, d) => sum + (d.spent || 0), 0);
    const totalRevenue = data.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
    const avgROI = data.reduce((sum, d) => sum + (d.roi || 0), 0) / data.length || 0;

    return {
      totalSpent,
      totalRevenue,
      avgROI,
      bestROI: Math.max(...data.map(d => d.roi || 0)),
      worstROI: Math.min(...data.map(d => d.roi || 0))
    };
  }

  generateROICharts(data) {
    const industryROI = {};
    data.forEach(item => {
      if (item.industry) {
        if (!industryROI[item.industry]) {
          industryROI[item.industry] = { totalROI: 0, count: 0 };
        }
        industryROI[item.industry].totalROI += item.roi || 0;
        industryROI[item.industry].count += 1;
      }
    });

    return {
      bar: [{
        name: 'ROI by Industry',
        data: Object.entries(industryROI).map(([industry, stats]) => ({
          label: industry,
          roi: stats.totalROI / stats.count
        }))
      }],
      pie: [{
        name: 'Performance Distribution',
        data: [
          { label: 'Excellent (>100%)', value: data.filter(d => d.roi > 100).length, color: '#10B981' },
          { label: 'Good (50-100%)', value: data.filter(d => d.roi > 50 && d.roi <= 100).length, color: '#3B82F6' },
          { label: 'Average (20-50%)', value: data.filter(d => d.roi > 20 && d.roi <= 50).length, color: '#F59E0B' },
          { label: 'Poor (<20%)', value: data.filter(d => d.roi <= 20).length, color: '#EF4444' }
        ]
      }]
    };
  }

  async getUserActivityData(dateRange, filters) {
    const query = {};
    if (dateRange?.start || dateRange?.end) {
      query.createdAt = {};
      if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
    }
    if (filters?.userType?.length) {
      query.userType = { $in: filters.userType };
    }

    return User.find(query)
      .select('fullName email userType createdAt status lastLogin')
      .sort('-createdAt')
      .limit(1000)
      .lean();
  }

  async getCampaignPerformanceData(dateRange, filters) {
    const query = {};
    if (dateRange?.start || dateRange?.end) {
      query.createdAt = {};
      if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
    }
    if (filters?.campaignStatus?.length) {
      query.status = { $in: filters.campaignStatus };
    }
    if (filters?.categories?.length) {
      query.category = { $in: filters.categories };
    }

    return Campaign.find(query)
      .populate('brandId', 'brandName')
      .sort('-createdAt')
      .lean();
  }

  async getFinancialData(dateRange, filters) {
    const query = { status: 'completed' };
    if (dateRange?.start || dateRange?.end) {
      query.createdAt = {};
      if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
    }

    return Payment.find(query)
      .populate('from.userId', 'fullName brandName')
      .populate('to.userId', 'fullName displayName')
      .populate('dealId')
      .sort('-createdAt')
      .lean();
  }

  async getEngagementData(dateRange, filters) {
    const query = { status: 'completed' };
    if (dateRange?.start || dateRange?.end) {
      query.completedAt = {};
      if (dateRange.start) query.completedAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.completedAt.$lte = new Date(dateRange.end);
    }

    return Deal.find(query)
      .populate('deliverables')
      .populate('brandId', 'brandName')
      .populate('creatorId', 'displayName handle')
      .lean();
  }

  calculateSummary(data) {
    if (!data || data.length === 0) {
      return { total: 0, average: 0, minimum: 0, maximum: 0 };
    }

    const values = data.map(item => item.value || item.amount || 1);
    
    return {
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values)
    };
  }

  calculateCampaignSummary(data) {
    const totalBudget = data.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = data.reduce((sum, c) => sum + (c.spent || 0), 0);
    
    return {
      totalCampaigns: data.length,
      totalBudget,
      totalSpent,
      averageBudget: data.length > 0 ? totalBudget / data.length : 0
    };
  }

  calculateFinancialSummary(data) {
    const totalRevenue = data.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = data.reduce((sum, p) => sum + p.fee, 0);
    
    return {
      totalRevenue,
      totalFees,
      netRevenue: totalRevenue - totalFees,
      transactionCount: data.length,
      avgTransactionValue: data.length > 0 ? totalRevenue / data.length : 0
    };
  }

  calculateEngagementSummary(data) {
    let totalImpressions = 0;
    let totalEngagement = 0;
    
    data.forEach(deal => {
      deal.deliverables?.forEach(del => {
        totalImpressions += del.metrics?.views || 0;
        totalEngagement += (del.metrics?.likes || 0) + 
                          (del.metrics?.comments || 0) + 
                          (del.metrics?.shares || 0);
      });
    });

    return {
      totalImpressions,
      totalEngagement,
      avgEngagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      totalDeals: data.length
    };
  }

  generateUserCharts(data) {
    const dailyData = {};
    data.forEach(user => {
      const date = new Date(user.createdAt).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { brands: 0, creators: 0, total: 0 };
      }
      dailyData[date].total++;
      if (user.userType === 'brand') dailyData[date].brands++;
      else dailyData[date].creators++;
    });

    return {
      line: [{
        name: 'User Growth',
        data: Object.entries(dailyData).map(([date, counts]) => ({
          x: date,
          y: counts.total
        }))
      }],
      bar: [{
        name: 'User Types',
        data: [
          { label: 'Brands', value: data.filter(u => u.userType === 'brand').length },
          { label: 'Creators', value: data.filter(u => u.userType === 'creator').length }
        ]
      }]
    };
  }

  generateCampaignCharts(data) {
    const statusCounts = {};
    data.forEach(campaign => {
      statusCounts[campaign.status] = (statusCounts[campaign.status] || 0) + 1;
    });

    return {
      pie: [{
        name: 'Campaign Status',
        data: Object.entries(statusCounts).map(([status, count], index) => ({
          label: status,
          value: count,
          color: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'][index % 4]
        }))
      }]
    };
  }

  generateFinancialCharts(data) {
    const monthlyData = {};
    data.forEach(payment => {
      const month = new Date(payment.createdAt).toLocaleDateString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, fees: 0 };
      }
      monthlyData[month].revenue += payment.amount;
      monthlyData[month].fees += payment.fee;
    });

    return {
      line: [{
        name: 'Revenue',
        data: Object.entries(monthlyData).map(([month, amounts]) => ({
          x: month,
          y: amounts.revenue
        }))
      }],
      bar: [{
        name: 'Revenue vs Fees',
        data: Object.entries(monthlyData).map(([month, amounts]) => ({
          label: month,
          revenue: amounts.revenue,
          fees: amounts.fees
        }))
      }]
    };
  }

  generateEngagementCharts(data) {
    const platformData = {
      instagram: { impressions: 0, engagement: 0 },
      youtube: { impressions: 0, engagement: 0 },
      tiktok: { impressions: 0, engagement: 0 }
    };

    data.forEach(deal => {
      deal.deliverables?.forEach(del => {
        const platform = del.platform || 'other';
        if (!platformData[platform]) {
          platformData[platform] = { impressions: 0, engagement: 0 };
        }
        platformData[platform].impressions += del.metrics?.views || 0;
        platformData[platform].engagement += (del.metrics?.likes || 0) + 
                                           (del.metrics?.comments || 0) + 
                                           (del.metrics?.shares || 0);
      });
    });

    return {
      bar: [{
        name: 'Platform Performance',
        data: Object.entries(platformData).map(([platform, metrics]) => ({
          label: platform,
          impressions: metrics.impressions,
          engagement: metrics.engagement
        }))
      }]
    };
  }

  // ==================== EXPORT FUNCTIONS ====================
  
  async exportReport(reportId, format = 'pdf') {
    const report = await Report.findById(reportId)
      .populate('userId', 'fullName email');

    if (!report) {
      throw new Error('Report not found');
    }

    switch (format) {
      case 'pdf':
        return this.exportToPDF(report);
      case 'csv':
        return this.exportToCSV(report);
      case 'json':
        return this.exportToJSON(report);
      case 'excel':
        return this.exportToExcel(report);
      default:
        throw new Error('Unsupported format');
    }
  }

  async exportToPDF(report) {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `report-${report._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../../uploads/reports', fileName);
    
    const dir = path.join(__dirname, '../../uploads/reports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add content
    doc.fontSize(20).text('InfluenceX Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(report.name);
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Type: ${report.type}`);
    doc.moveDown();

    if (report.summary) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12).text(`Total: ${report.summary.total || 0}`);
      doc.text(`Average: ${report.summary.average || 0}`);
      doc.text(`Minimum: ${report.summary.minimum || 0}`);
      doc.text(`Maximum: ${report.summary.maximum || 0}`);
    }

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      success: true,
      filePath,
      filename: fileName,
      url: `/uploads/reports/${fileName}`
    };
  }

  async exportToCSV(report) {
    let csv = '';
    
    if (report.data && report.data.length > 0) {
      const headers = Object.keys(report.data[0]);
      csv += headers.join(',') + '\n';
      
      report.data.forEach(row => {
        csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
      });
    }

    return {
      success: true,
      data: csv,
      filename: `${report.name.replace(/\s+/g, '_')}_${Date.now()}.csv`
    };
  }

  async exportToJSON(report) {
    return {
      success: true,
      data: report,
      filename: `${report.name.replace(/\s+/g, '_')}_${Date.now()}.json`
    };
  }

  async exportToExcel(report) {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    if (report.data && report.data.length > 0) {
      const headers = Object.keys(report.data[0]);
      worksheet.addRow(headers);

      // Add data
      report.data.forEach(item => {
        worksheet.addRow(Object.values(item));
      });
    }

    // Add summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    if (report.summary) {
      Object.entries(report.summary).forEach(([key, value]) => {
        worksheet.addRow([key, value]);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    
    return {
      success: true,
      data: buffer,
      filename: `${report.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
    };
  }
}

module.exports = new AnalyticsService();