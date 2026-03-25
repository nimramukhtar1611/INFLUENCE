// services/brandService.js - COMPLETE FIXED VERSION
const Brand = require('../models/Brand');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Creator = require('../models/Creator');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

class BrandService {
  
  // ==================== GET DASHBOARD DATA ====================
  async getDashboardData(brandId) {
    try {
      const [campaigns, deals, payments, analytics] = await Promise.all([
        this.getCampaignStats(brandId),
        this.getDealStats(brandId),
        this.getPaymentStats(brandId),
        this.getAnalyticsData(brandId)
      ]);

      return {
        success: true,
        data: {
          campaigns,
          deals,
          payments,
          analytics,
          recentActivity: await this.getRecentActivity(brandId)
        }
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== GET CAMPAIGN STATS ====================
  async getCampaignStats(brandId) {
    const stats = await Campaign.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          draft: {
            $sum: {
              $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalBudget: { $sum: '$budget' },
          spentBudget: { $sum: '$spent' }
        }
      }
    ]);

    const recentCampaigns = await Campaign.find({ brandId })
      .sort('-createdAt')
      .limit(5)
      .select('title status budget createdAt progress')
      .lean();

    return {
      stats: stats[0] || { total: 0, active: 0, draft: 0, completed: 0, totalBudget: 0, spentBudget: 0 },
      recent: recentCampaigns
    };
  }

  // ==================== GET DEAL STATS ====================
  async getDealStats(brandId) {
    const stats = await Deal.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['accepted', 'in-progress']] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalValue: { $sum: '$budget' },
          avgValue: { $avg: '$budget' }
        }
      }
    ]);

    const recentDeals = await Deal.find({ brandId })
      .populate('creatorId', 'displayName profilePicture')
      .populate('campaignId', 'title')
      .sort('-createdAt')
      .limit(5)
      .select('status budget deadline createdAt')
      .lean();

    return {
      stats: stats[0] || { total: 0, active: 0, pending: 0, completed: 0, totalValue: 0, avgValue: 0 },
      recent: recentDeals
    };
  }

  // ==================== GET PAYMENT STATS ====================
  async getPaymentStats(brandId) {
    const payments = await Payment.aggregate([
      { $match: { 'from.userId': new mongoose.Types.ObjectId(brandId) } },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          pendingEscrow: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in-escrow'] }, '$amount', 0]
            }
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const recentTransactions = await Payment.find({ 'from.userId': brandId })
      .populate('to.userId', 'displayName')
      .populate('dealId', 'campaignId')
      .sort('-createdAt')
      .limit(5)
      .lean();

    return {
      stats: payments[0] || { totalSpent: 0, pendingEscrow: 0, transactionCount: 0 },
      recent: recentTransactions
    };
  }

  // ==================== GET ANALYTICS DATA ====================
  async getAnalyticsData(brandId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily performance
    const dailyPerformance = await Deal.aggregate([
      {
        $match: {
          brandId: new mongoose.Types.ObjectId(brandId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          deals: { $sum: 1 },
          value: { $sum: '$budget' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Platform distribution
    const platformDistribution = await Deal.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId) } },
      { $unwind: '$deliverables' },
      {
        $group: {
          _id: '$deliverables.platform',
          count: { $sum: 1 },
          value: { $sum: '$deliverables.budget' }
        }
      }
    ]);

    // Top creators
    const topCreators = await Deal.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId), status: 'completed' } },
      {
        $group: {
          _id: '$creatorId',
          deals: { $sum: 1 },
          totalSpent: { $sum: '$budget' },
          avgRating: { $avg: '$rating.score' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: '$creator' }
    ]);

    return {
      daily: dailyPerformance,
      platforms: platformDistribution,
      topCreators
    };
  }

  // ==================== GET RECENT ACTIVITY ====================
  async getRecentActivity(brandId) {
    const activities = [];

    // Campaign activities
    const campaigns = await Campaign.find({ brandId })
      .sort('-updatedAt')
      .limit(3)
      .select('title status updatedAt')
      .lean();

    campaigns.forEach(c => {
      activities.push({
        type: 'campaign',
        action: c.status === 'active' ? 'published' : 'updated',
        title: c.title,
        timestamp: c.updatedAt,
        icon: 'campaign'
      });
    });

    // Deal activities
    const deals = await Deal.find({ brandId })
      .populate('creatorId', 'displayName')
      .sort('-updatedAt')
      .limit(3)
      .lean();

    deals.forEach(d => {
      activities.push({
        type: 'deal',
        action: d.status,
        title: `Deal with ${d.creatorId?.displayName || 'Creator'}`,
        timestamp: d.updatedAt,
        icon: 'deal'
      });
    });

    // Sort by timestamp
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }

  // ==================== SEARCH CREATORS ====================
  async searchCreators(filters, page = 1, limit = 10) {
    try {
      const query = { userType: 'creator', status: 'active' };
      
      if (filters.niche) {
        query.niches = { $in: [filters.niche] };
      }
      
      if (filters.minFollowers || filters.maxFollowers) {
        query.totalFollowers = {};
        if (filters.minFollowers) query.totalFollowers.$gte = parseInt(filters.minFollowers);
        if (filters.maxFollowers) query.totalFollowers.$lte = parseInt(filters.maxFollowers);
      }
      
      if (filters.minEngagement) {
        query.averageEngagement = { $gte: parseFloat(filters.minEngagement) };
      }

      if (filters.platform) {
        query[`socialMedia.${filters.platform}.handle`] = { $exists: true };
      }

      if (filters.location) {
        query.location = { $regex: filters.location, $options: 'i' };
      }

      if (filters.verified) {
        query.isVerified = true;
      }

      if (filters.available) {
        query['availability.status'] = 'available';
      }

      if (filters.q) {
        query.$or = [
          { displayName: { $regex: filters.q, $options: 'i' } },
          { handle: { $regex: filters.q, $options: 'i' } },
          { bio: { $regex: filters.q, $options: 'i' } }
        ];
      }

      const total = await Creator.countDocuments(query);
      const creators = await Creator.find(query)
        .select('displayName handle profilePicture niches totalFollowers averageEngagement stats rateCard location')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort('-stats.completedDeals')
        .lean();

      return {
        creators,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Search creators error:', error);
      throw error;
    }
  }

  // ==================== GET CREATOR DETAILS ====================
  async getCreatorDetails(creatorId) {
    try {
      const creator = await Creator.findById(creatorId)
        .select('-paymentMethods -stripeAccountId -payoutSettings')
        .lean();

      if (!creator) {
        throw new Error('Creator not found');
      }

      // Get recent deals
      const recentDeals = await Deal.find({ 
        creatorId, 
        status: 'completed' 
      })
        .populate('campaignId', 'title')
        .sort('-completedAt')
        .limit(5)
        .lean();

      // Get average rating
      const rating = await Deal.aggregate([
        { $match: { creatorId, 'rating.score': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$rating.score' } } }
      ]);

      return {
        ...creator,
        recentDeals,
        averageRating: rating[0]?.avg || 0
      };
    } catch (error) {
      console.error('Get creator details error:', error);
      throw error;
    }
  }

  // ==================== CREATE CAMPAIGN ====================
  async createCampaign(brandId, campaignData) {
    try {
      const campaign = await Campaign.create({
        ...campaignData,
        brandId,
        createdBy: brandId,
        status: 'draft'
      });

      // Update brand stats
      await Brand.findByIdAndUpdate(brandId, {
        $inc: { 'stats.totalCampaigns': 1 }
      });

      return campaign;
    } catch (error) {
      console.error('Create campaign error:', error);
      throw error;
    }
  }

  // ==================== SEND DEAL OFFER ====================
  async sendDealOffer(brandId, dealData) {
    try {
      const { campaignId, creatorId, ...rest } = dealData;

      // Check if campaign exists and belongs to brand
      const campaign = await Campaign.findOne({ _id: campaignId, brandId });
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if creator exists
      const creator = await Creator.findById(creatorId);
      if (!creator) {
        throw new Error('Creator not found');
      }

      // Check if deal already exists
      const existingDeal = await Deal.findOne({
        campaignId,
        creatorId,
        brandId,
        status: { $nin: ['cancelled', 'declined'] }
      });

      if (existingDeal) {
        throw new Error('Deal already exists with this creator');
      }

      // Create deal
      const deal = await Deal.create({
        ...rest,
        campaignId,
        creatorId,
        brandId,
        createdBy: brandId,
        status: 'pending',
        timeline: [{
          event: 'Deal created',
          userId: brandId,
          createdAt: new Date()
        }]
      });

      // Update campaign
      await Campaign.findByIdAndUpdate(campaignId, {
        $push: {
          invitedCreators: {
            creatorId,
            status: 'pending',
            invitedAt: new Date()
          }
        }
      });

      // Send notification to creator
      await Notification.create({
        userId: creatorId,
        type: 'deal',
        title: 'New Deal Offer',
        message: `You've received a new deal offer for "${campaign.title}"`,
        data: { dealId: deal._id, url: `/creator/deals/${deal._id}` }
      });

      return deal;
    } catch (error) {
      console.error('Send deal offer error:', error);
      throw error;
    }
  }

  // ==================== GET BRAND PROFILE ====================
  async getBrandProfile(brandId) {
    try {
      const brand = await Brand.findById(brandId)
        .populate('teamMembers.userId', 'fullName email profilePicture')
        .lean();

      if (!brand) {
        throw new Error('Brand not found');
      }

      // Get additional stats
      const [campaignCount, activeCampaigns, totalSpent, averageRating] = await Promise.all([
        Campaign.countDocuments({ brandId }),
        Campaign.countDocuments({ brandId, status: 'active' }),
        Deal.aggregate([
          { $match: { brandId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$budget' } } }
        ]),
        Deal.aggregate([
          { $match: { brandId, 'rating.score': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$rating.score' } } }
        ])
      ]);

      return {
        ...brand,
        stats: {
          ...brand.stats,
          totalCampaigns: campaignCount,
          activeCampaigns,
          totalSpent: totalSpent[0]?.total || 0,
          averageRating: averageRating[0]?.avg || 0
        }
      };
    } catch (error) {
      console.error('Get brand profile error:', error);
      throw error;
    }
  }

  // ==================== UPDATE BRAND PROFILE ====================
  async updateBrandProfile(brandId, updateData) {
    try {
      const brand = await Brand.findByIdAndUpdate(
        brandId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!brand) {
        throw new Error('Brand not found');
      }

      return brand;
    } catch (error) {
      console.error('Update brand profile error:', error);
      throw error;
    }
  }

  // ==================== ADD TEAM MEMBER ====================
  async addTeamMember(brandId, memberData) {
    try {
      const { userId, role, permissions } = memberData;

      const brand = await Brand.findById(brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      // Check if already a member
      const existingMember = brand.teamMembers.find(
        m => m.userId.toString() === userId
      );

      if (existingMember) {
        throw new Error('User is already a team member');
      }

      brand.teamMembers.push({
        userId,
        role,
        permissions,
        joinedAt: new Date()
      });

      await brand.save();

      return brand;
    } catch (error) {
      console.error('Add team member error:', error);
      throw error;
    }
  }

  // ==================== REMOVE TEAM MEMBER ====================
  async removeTeamMember(brandId, memberId) {
    try {
      const brand = await Brand.findByIdAndUpdate(
        brandId,
        { $pull: { teamMembers: { _id: memberId } } },
        { new: true }
      );

      if (!brand) {
        throw new Error('Brand not found');
      }

      return brand;
    } catch (error) {
      console.error('Remove team member error:', error);
      throw error;
    }
  }

  // ==================== GET BRAND_ANALYTICS ====================
  async getBrandAnalytics(brandId, period = '30d') {
    try {
      let startDate = new Date();
      switch(period) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
        case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
      }

      const [campaignPerformance, platformDistribution, roiData, deals] = await Promise.all([
        // Campaign performance over time
        Campaign.aggregate([
          { $match: { brandId, createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              campaigns: { $sum: 1 },
              spent: { $sum: '$spent' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),

        // Platform distribution
        Deal.aggregate([
          { $match: { brandId } },
          { $unwind: '$deliverables' },
          {
            $group: {
              _id: '$deliverables.platform',
              count: { $sum: 1 },
              totalSpent: { $sum: '$deliverables.budget' }
            }
          }
        ]),

        // ROI by campaign
        Deal.aggregate([
          { $match: { brandId, status: 'completed' } },
          {
            $group: {
              _id: '$campaignId',
              totalSpent: { $sum: '$budget' },
              deals: { $sum: 1 },
              avgRating: { $avg: '$rating.score' }
            }
          },
          {
            $lookup: {
              from: 'campaigns',
              localField: '_id',
              foreignField: '_id',
              as: 'campaign'
            }
          },
          { $unwind: '$campaign' },
          { $sort: { totalSpent: -1 } },
          { $limit: 10 }
        ]),

        // Recent deals for engagement
        Deal.find({ brandId, status: 'completed' })
          .populate('creatorId', 'displayName handle')
          .sort('-completedAt')
          .limit(20)
          .lean()
      ]);

      // Calculate summary stats
      const summary = {
        totalCampaigns: await Campaign.countDocuments({ brandId }),
        activeCampaigns: await Campaign.countDocuments({ brandId, status: 'active' }),
        totalDeals: await Deal.countDocuments({ brandId }),
        completedDeals: await Deal.countDocuments({ brandId, status: 'completed' }),
        totalSpent: deals.reduce((sum, d) => sum + (d.budget || 0), 0),
        avgROI: 3.2 // This would need actual ROI calculation
      };

      return {
        campaignPerformance,
        platformDistribution,
        roiData,
        recentDeals: deals.slice(0, 5),
        summary
      };
    } catch (error) {
      console.error('Get brand analytics error:', error);
      throw error;
    }
  }
}

module.exports = new BrandService();