// services/creatorService.js - COMPLETE FIXED VERSION
const Creator = require('../models/Creator');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Campaign = require('../models/Campaign');
const Notification = require('../models/Notification');
const SocialService = require('./socialService');
const mongoose = require('mongoose');

class CreatorService {
  
  // ==================== GET DASHBOARD DATA ====================
  async getDashboardData(creatorId) {
    try {
      const [profile, activeDeals, completedDeals, earnings] = await Promise.all([
        Creator.findById(creatorId).lean(),
        Deal.find({ 
          creatorId, 
          status: { $in: ['accepted', 'in-progress'] } 
        })
          .populate('brandId', 'brandName logo')
          .populate('campaignId', 'title')
          .sort('-createdAt')
          .limit(5)
          .lean(),
        Deal.countDocuments({ creatorId, status: 'completed' }),
        Payment.aggregate([
          { $match: { 'to.userId': creatorId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ])
      ]);

      return {
        success: true,
        data: {
          profile,
          activeDeals,
          completedDeals,
          totalEarnings: earnings[0]?.total || 0,
          stats: {
            totalDeals: await Deal.countDocuments({ creatorId }),
            activeDealsCount: activeDeals.length,
            completedDealsCount: completedDeals
          }
        }
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== VERIFY SOCIAL MEDIA ====================
  async verifySocialMedia(creatorId, platform, handle) {
    try {
      const socialService = new SocialService();
      let result;

      switch(platform) {
        case 'instagram':
          result = await socialService.verifyInstagram(handle);
          break;
        case 'youtube':
          result = await socialService.verifyYouTube(handle);
          break;
        case 'tiktok':
          result = await socialService.verifyTikTok(handle);
          break;
        case 'twitter':
          result = await socialService.verifyTwitter(handle);
          break;
        default:
          throw new Error('Unsupported platform');
      }

      if (result.success) {
        // Update creator's social media stats
        const updatePath = `socialMedia.${platform}`;
        const creator = await Creator.findByIdAndUpdate(
          creatorId,
          { 
            $set: { 
              [updatePath]: result.data,
              [`socialVerification.${platform}`]: true,
              lastSocialSync: new Date()
            } 
          },
          { new: true }
        );

        // Recalculate total followers
        await creator.save(); // This triggers pre-save middleware

        return result;
      } else {
        throw new Error(result.error || 'Failed to verify account');
      }
    } catch (error) {
      console.error('Verify social media error:', error);
      throw error;
    }
  }

  // ==================== GET AVAILABLE CAMPAIGNS ====================
  async getAvailableCampaigns(creatorId, filters = {}, page = 1, limit = 10) {
    try {
      const creator = await Creator.findById(creatorId);
      if (!creator) {
        throw new Error('Creator not found');
      }

      const query = { 
        status: 'active',
        $or: [
          { 'applications.creatorId': { $ne: creatorId } },
          { applications: { $size: 0 } }
        ]
      };

      // Add filters
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.minBudget || filters.maxBudget) {
        query.budget = {};
        if (filters.minBudget) query.budget.$gte = parseInt(filters.minBudget);
        if (filters.maxBudget) query.budget.$lte = parseInt(filters.maxBudget);
      }

      if (filters.platform) {
        query['targetAudience.platforms'] = filters.platform;
      }

      // Match with creator's niches
      if (creator.niches && creator.niches.length > 0) {
        query['targetAudience.niches'] = { $in: creator.niches };
      }

      const total = await Campaign.countDocuments(query);
      const campaigns = await Campaign.find(query)
        .populate('brandId', 'brandName logo industry')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return {
        campaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get available campaigns error:', error);
      throw error;
    }
  }

  // ==================== APPLY TO CAMPAIGN ====================
  async applyToCampaign(creatorId, campaignId, applicationData) {
    try {
      const { proposal, rate, portfolio } = applicationData;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'active') {
        throw new Error('Campaign is not accepting applications');
      }

      // Check if already applied
      const alreadyApplied = campaign.applications.some(
        app => app.creatorId.toString() === creatorId.toString()
      );

      if (alreadyApplied) {
        throw new Error('You have already applied to this campaign');
      }

      // Add application
      campaign.applications.push({
        creatorId,
        proposal,
        rate: rate || campaign.budget,
        portfolio: portfolio || [],
        appliedAt: new Date(),
        status: 'pending'
      });

      await campaign.save();

      // Notify brand
      await Notification.create({
        userId: campaign.brandId,
        type: 'campaign',
        title: 'New Application',
        message: `A creator has applied to your campaign "${campaign.title}"`,
        data: { 
          campaignId: campaign._id,
          creatorId,
          url: `/brand/campaigns/${campaign._id}`
        }
      });

      return campaign;
    } catch (error) {
      console.error('Apply to campaign error:', error);
      throw error;
    }
  }

  // ==================== GET CREATOR DEALS ====================
  async getCreatorDeals(creatorId, status = 'all', page = 1, limit = 10) {
    try {
      const query = { creatorId };
      if (status !== 'all') {
        query.status = status;
      }

      const [deals, total, counts] = await Promise.all([
        Deal.find(query)
          .populate('brandId', 'brandName logo')
          .populate('campaignId', 'title')
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Deal.countDocuments(query),
        Deal.aggregate([
          { $match: { creatorId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              value: { $sum: '$budget' }
            }
          }
        ])
      ]);

      return {
        deals,
        counts: counts.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, value: curr.value };
          return acc;
        }, {}),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get creator deals error:', error);
      throw error;
    }
  }

  // ==================== ACCEPT DEAL ====================
  async acceptDeal(creatorId, dealId) {
    try {
      const deal = await Deal.findOne({
        _id: dealId,
        creatorId,
        status: 'pending'
      });

      if (!deal) {
        throw new Error('Deal not found or cannot be accepted');
      }

      deal.status = 'accepted';
      deal.timeline.push({
        event: 'Deal accepted',
        userId: creatorId,
        createdAt: new Date()
      });
      await deal.save();

      // Notify brand
      await Notification.create({
        userId: deal.brandId,
        type: 'deal',
        title: 'Deal Accepted',
        message: 'Creator has accepted your deal offer',
        data: { dealId: deal._id, url: `/brand/deals/${deal._id}` }
      });

      return deal;
    } catch (error) {
      console.error('Accept deal error:', error);
      throw error;
    }
  }

  // ==================== REJECT DEAL ====================
  async rejectDeal(creatorId, dealId, reason) {
    try {
      const deal = await Deal.findOne({
        _id: dealId,
        creatorId,
        status: 'pending'
      });

      if (!deal) {
        throw new Error('Deal not found or cannot be rejected');
      }

      deal.status = 'declined';
      deal.timeline.push({
        event: 'Deal declined',
        description: reason,
        userId: creatorId,
        createdAt: new Date()
      });
      await deal.save();

      // Notify brand
      await Notification.create({
        userId: deal.brandId,
        type: 'deal',
        title: 'Deal Declined',
        message: reason || 'Deal has been declined',
        data: { dealId: deal._id }
      });

      return deal;
    } catch (error) {
      console.error('Reject deal error:', error);
      throw error;
    }
  }

  // ==================== SUBMIT DELIVERABLES ====================
  async submitDeliverables(creatorId, dealId, deliverables) {
    try {
      const deal = await Deal.findOne({
        _id: dealId,
        creatorId,
        status: { $in: ['accepted', 'in-progress', 'revision'] }
      });

      if (!deal) {
        throw new Error('Deal not found or cannot submit deliverables');
      }

      // Update deliverables
      deliverables.forEach(newDel => {
        const existingDel = deal.deliverables.id(newDel._id);
        if (existingDel) {
          existingDel.status = 'submitted';
          existingDel.submittedAt = new Date();
          if (newDel.files) existingDel.files = newDel.files;
          if (newDel.links) existingDel.links = newDel.links;
        }
      });

      deal.status = 'in-progress';
      deal.timeline.push({
        event: 'Deliverables submitted',
        userId: creatorId,
        createdAt: new Date()
      });
      await deal.save();

      // Notify brand
      await Notification.create({
        userId: deal.brandId,
        type: 'deal',
        title: 'Deliverables Submitted',
        message: 'Creator has submitted deliverables for review',
        data: { dealId: deal._id, url: `/brand/deals/${deal._id}` }
      });

      return deal;
    } catch (error) {
      console.error('Submit deliverables error:', error);
      throw error;
    }
  }

  // ==================== GET EARNINGS SUMMARY ====================
  async getEarningsSummary(creatorId) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const [total, thisMonth, lastMonth, averageDealValue] = await Promise.all([
        Payment.aggregate([
          { $match: { 'to.userId': creatorId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Payment.aggregate([
          { $match: { 'to.userId': creatorId, status: 'completed', createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Payment.aggregate([
          { 
            $match: { 
              'to.userId': creatorId, 
              status: 'completed', 
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
            } 
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Deal.aggregate([
          { $match: { creatorId, status: 'completed' } },
          { $group: { _id: null, avg: { $avg: '$budget' } } }
        ])
      ]);

      return {
        summary: {
          total: total[0]?.total || 0,
          thisMonth: thisMonth[0]?.total || 0,
          lastMonth: lastMonth[0]?.total || 1, // Default to 1 to avoid division by zero
          averageDealValue: averageDealValue[0]?.avg || 0
        }
      };
    } catch (error) {
      console.error('Get earnings summary error:', error);
      throw error;
    }
  }

  // ==================== GET ANALYTICS ====================
  async getAnalytics(creatorId, period = '30d') {
    try {
      let startDate = new Date();
      switch(period) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
        case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
      }

      const [monthlyEarnings, platformStats, brandStats, engagement] = await Promise.all([
        // Monthly earnings
        Payment.aggregate([
          { 
            $match: { 
              'to.userId': creatorId, 
              status: 'completed',
              createdAt: { $gte: startDate }
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              earnings: { $sum: '$netAmount' },
              deals: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),

        // Platform stats from social media
        Creator.findById(creatorId)
          .select('socialMedia totalFollowers averageEngagement')
          .lean(),

        // Top brands
        Deal.aggregate([
          { $match: { creatorId, status: 'completed' } },
          {
            $group: {
              _id: '$brandId',
              deals: { $sum: 1 },
              earnings: { $sum: '$budget' }
            }
          },
          { $sort: { earnings: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'brands',
              localField: '_id',
              foreignField: '_id',
              as: 'brand'
            }
          },
          { $unwind: '$brand' }
        ]),

        // Engagement metrics
        Deal.aggregate([
          { $match: { creatorId, status: 'completed', completedAt: { $gte: startDate } } },
          {
            $group: {
              _id: null,
              totalImpressions: { $sum: '$metrics.impressions' },
              totalLikes: { $sum: '$metrics.likes' },
              totalComments: { $sum: '$metrics.comments' },
              totalShares: { $sum: '$metrics.shares' },
              totalClicks: { $sum: '$metrics.clicks' }
            }
          }
        ])
      ]);

      // Format monthly data
      const monthlyData = monthlyEarnings.map(item => ({
        month: `${item._id.month}/${item._id.year}`,
        earnings: item.earnings,
        deals: item.deals
      }));

      // Platform distribution
      const platformData = [];
      if (platformStats?.socialMedia?.instagram?.followers) {
        platformData.push({
          name: 'instagram',
          followers: platformStats.socialMedia.instagram.followers,
          engagement: platformStats.socialMedia.instagram.engagement || 0,
          color: '#E1306C'
        });
      }
      if (platformStats?.socialMedia?.youtube?.subscribers) {
        platformData.push({
          name: 'youtube',
          followers: platformStats.socialMedia.youtube.subscribers,
          engagement: platformStats.socialMedia.youtube.engagement || 0,
          color: '#FF0000'
        });
      }
      if (platformStats?.socialMedia?.tiktok?.followers) {
        platformData.push({
          name: 'tiktok',
          followers: platformStats.socialMedia.tiktok.followers,
          engagement: platformStats.socialMedia.tiktok.engagement || 0,
          color: '#000000'
        });
      }

      // Summary stats
      const totalEarnings = monthlyData.reduce((sum, m) => sum + m.earnings, 0);
      const totalDeals = monthlyData.reduce((sum, m) => sum + m.deals, 0);

      return {
        analytics: {
          summary: {
            totalEarnings,
            totalDeals,
            completedDeals: totalDeals,
            averageDealValue: totalDeals > 0 ? totalEarnings / totalDeals : 0,
            averageRating: platformStats?.stats?.averageRating || 0,
            totalFollowers: platformStats?.totalFollowers || 0,
            averageEngagement: platformStats?.averageEngagement || 0
          },
          monthly: monthlyData,
          platforms: platformData,
          topBrands: brandStats,
          engagement: engagement[0] || {
            totalImpressions: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalClicks: 0
          }
        }
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  }

  // ==================== UPDATE PROFILE ====================
  async updateProfile(creatorId, updateData) {
    try {
      // Validation
      if (updateData.handle) {
        const existingCreator = await Creator.findOne({ 
          handle: updateData.handle, 
          _id: { $ne: creatorId } 
        });
        if (existingCreator) {
          throw new Error('Handle already taken');
        }
      }

      const creator = await Creator.findByIdAndUpdate(
        creatorId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!creator) {
        throw new Error('Creator not found');
      }

      return creator;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // ==================== ADD PORTFOLIO ITEM ====================
  async addPortfolioItem(creatorId, itemData) {
    try {
      const { title, description, mediaUrl, platform, brand, campaign, performance } = itemData;

      const creator = await Creator.findByIdAndUpdate(
        creatorId,
        {
          $push: {
            portfolio: {
              title,
              description,
              mediaUrl,
              platform,
              brand,
              campaign,
              performance: performance || { views: 0, likes: 0, comments: 0, shares: 0 },
              date: new Date()
            }
          }
        },
        { new: true }
      );

      if (!creator) {
        throw new Error('Creator not found');
      }

      return creator;
    } catch (error) {
      console.error('Add portfolio error:', error);
      throw error;
    }
  }

  // ==================== GET CREATOR PROFILE ====================
  async getCreatorProfile(creatorId) {
    try {
      const creator = await Creator.findById(creatorId)
        .select('-paymentMethods -stripeAccountId -payoutSettings')
        .lean();

      if (!creator) {
        throw new Error('Creator not found');
      }

      // Get recent deals
      const recentDeals = await Deal.find({ creatorId, status: 'completed' })
        .populate('brandId', 'brandName logo')
        .sort('-completedAt')
        .limit(5)
        .lean();

      return {
        ...creator,
        recentDeals
      };
    } catch (error) {
      console.error('Get creator profile error:', error);
      throw error;
    }
  }
}

module.exports = new CreatorService();