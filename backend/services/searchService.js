const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Brand = require('../models/Brand');
const User = require('../models/User');
const Deal = require('../models/Deal');
const MatchEngine = require('./matchEngine');
const cacheService = require('./cacheService');
const mongoose = require('mongoose');

class SearchService {
  
  // ==================== CREATOR SEARCH ====================

  /**
   * Search creators with advanced filtering and matching
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>}
   */
  async searchCreators(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        campaignId,
        includeUnavailable = false,
        includeUnverified = false
      } = options;

      const query = this.buildCreatorQuery(filters, { includeUnavailable, includeUnverified });
      
      // Get total count for pagination
      const total = await Creator.countDocuments(query);

      // Get creators
      let creators = await Creator.find(query)
        .select('-paymentMethods -stripeAccountId -payoutSettings -twoFactorSecret')
        .lean();

      // If campaign ID provided, calculate match scores
      if (campaignId) {
        const campaign = await Campaign.findById(campaignId).lean();
        if (campaign) {
          creators = await this.calculateCreatorMatchScores(creators, campaign);
          
          // Sort by match score
          creators.sort((a, b) => b.matchScore - a.matchScore);
        }
      } else {
        // Apply regular sorting
        creators = this.applyCreatorSorting(creators, sortBy);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedCreators = creators.slice(startIndex, startIndex + limit);

      return {
        success: true,
        creators: paginatedCreators,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: startIndex + paginatedCreators.length < total
        },
        filters: filters,
        hasMatchScores: !!campaignId
      };
    } catch (error) {
      console.error('Search creators error:', error);
      return {
        success: false,
        error: error.message,
        creators: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1, hasMore: false }
      };
    }
  }

  /**
   * Build creator search query
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Object} MongoDB query
   */
  buildCreatorQuery(filters, options = {}) {
    const { includeUnavailable = false, includeUnverified = false } = options;
    const query = {};

    // Text search
    if (filters.q) {
      query.$or = [
        { displayName: { $regex: filters.q, $options: 'i' } },
        { handle: { $regex: filters.q, $options: 'i' } },
        { bio: { $regex: filters.q, $options: 'i' } },
        { location: { $regex: filters.q, $options: 'i' } }
      ];
    }

    // Niche filters
    if (filters.niche) {
      query.niches = { $in: Array.isArray(filters.niche) ? filters.niche : [filters.niche] };
    }

    if (filters.niches?.length) {
      query.niches = { $in: filters.niches };
    }

    // Follower filters
    if (filters.minFollowers || filters.maxFollowers) {
      query.totalFollowers = {};
      if (filters.minFollowers) query.totalFollowers.$gte = parseInt(filters.minFollowers);
      if (filters.maxFollowers) query.totalFollowers.$lte = parseInt(filters.maxFollowers);
    }

    if (filters.followerRange) {
      const [min, max] = filters.followerRange.split('-').map(Number);
      query.totalFollowers = { $gte: min, $lte: max };
    }

    // Engagement filters
    if (filters.minEngagement) {
      query.averageEngagement = { $gte: parseFloat(filters.minEngagement) };
    }

    if (filters.maxEngagement) {
      query.averageEngagement = { 
        ...query.averageEngagement, 
        $lte: parseFloat(filters.maxEngagement) 
      };
    }

    if (filters.engagementRange) {
      const [min, max] = filters.engagementRange.split('-').map(Number);
      query.averageEngagement = { $gte: min, $lte: max };
    }

    // Platform filters
    if (filters.platform) {
      const platformQuery = {};
      platformQuery[`socialMedia.${filters.platform}.handle`] = { $exists: true };
      Object.assign(query, platformQuery);
    }

    if (filters.platforms?.length) {
      const platformQueries = filters.platforms.map(p => ({
        [`socialMedia.${p}.handle`]: { $exists: true }
      }));
      query.$and = platformQueries;
    }

    // Location filters
    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.country) {
      query['location.country'] = filters.country;
    }

    if (filters.city) {
      query['location.city'] = filters.city;
    }

    // Verification status
    if (filters.verified === 'true' || filters.verified === true) {
      query.isVerified = true;
    }

    if (!includeUnverified && filters.verified !== false) {
      // By default, only show verified creators
      query.isVerified = true;
    }

    // Availability
    if (filters.available === 'true' || filters.available === true) {
      query['availability.status'] = 'available';
    }

    if (!includeUnavailable && filters.available !== false) {
      // By default, only show available creators
      query['availability.status'] = 'available';
    }

    // Rating filters
    if (filters.minRating) {
      query['stats.averageRating'] = { $gte: parseFloat(filters.minRating) };
    }

    if (filters.maxRating) {
      query['stats.averageRating'] = { 
        ...query['stats.averageRating'], 
        $lte: parseFloat(filters.maxRating) 
      };
    }

    // Deal filters
    if (filters.minDeals) {
      query['stats.completedDeals'] = { $gte: parseInt(filters.minDeals) };
    }

    if (filters.minEarnings) {
      query['stats.totalEarnings'] = { $gte: parseInt(filters.minEarnings) };
    }

    // Exclude specific creators
    if (filters.excludeIds?.length) {
      query._id = { $nin: filters.excludeIds };
    }

    return query;
  }

  /**
   * Calculate match scores for creators against a campaign
   * @param {Array} creators - List of creators
   * @param {Object} campaign - Campaign object
   * @returns {Promise<Array>} Creators with match scores
   */
  async calculateCreatorMatchScores(creators, campaign) {
    const creatorsWithScores = await Promise.all(
      creators.map(async (creator) => {
        const matchScore = await MatchEngine.calculateMatchScore(creator, campaign);
        return {
          ...creator,
          matchScore: matchScore.score,
          matchLevel: matchScore.level,
          matchReason: matchScore.reason,
          matchBreakdown: matchScore.breakdown
        };
      })
    );

    return creatorsWithScores;
  }

  /**
   * Apply sorting to creators
   * @param {Array} creators - List of creators
   * @param {string} sortBy - Sort field
   * @returns {Array} Sorted creators
   */
  applyCreatorSorting(creators, sortBy) {
    switch (sortBy) {
      case 'followers_desc':
        return creators.sort((a, b) => (b.totalFollowers || 0) - (a.totalFollowers || 0));
      
      case 'followers_asc':
        return creators.sort((a, b) => (a.totalFollowers || 0) - (b.totalFollowers || 0));
      
      case 'engagement_desc':
        return creators.sort((a, b) => (b.averageEngagement || 0) - (a.averageEngagement || 0));
      
      case 'engagement_asc':
        return creators.sort((a, b) => (a.averageEngagement || 0) - (b.averageEngagement || 0));
      
      case 'rating_desc':
        return creators.sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0));
      
      case 'newest':
        return creators.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      case 'oldest':
        return creators.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      case 'deals_desc':
        return creators.sort((a, b) => (b.stats?.completedDeals || 0) - (a.stats?.completedDeals || 0));
      
      case 'earnings_desc':
        return creators.sort((a, b) => (b.stats?.totalEarnings || 0) - (a.stats?.totalEarnings || 0));
      
      case 'relevance':
      default:
        // Relevance is calculated separately
        return creators;
    }
  }

  // ==================== CAMPAIGN SEARCH ====================

  /**
   * Search campaigns with advanced filtering
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>}
   */
  async searchCampaigns(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'newest',
        creatorId,
        includeExpired = false
      } = options;

      const query = this.buildCampaignQuery(filters, { includeExpired });
      
      // Get total count
      const total = await Campaign.countDocuments(query);

      // Get campaigns
      let campaigns = await Campaign.find(query)
        .populate('brandId', 'brandName logo industry')
        .lean();

      // If creator ID provided, calculate match scores
      if (creatorId) {
        const creator = await Creator.findById(creatorId).lean();
        if (creator) {
          campaigns = await this.calculateCampaignMatchScores(campaigns, creator);
          
          // Sort by match score
          campaigns.sort((a, b) => b.matchScore - a.matchScore);
        }
      } else {
        // Apply regular sorting
        campaigns = this.applyCampaignSorting(campaigns, sortBy);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedCampaigns = campaigns.slice(startIndex, startIndex + limit);

      return {
        success: true,
        campaigns: paginatedCampaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: startIndex + paginatedCampaigns.length < total
        },
        filters: filters,
        hasMatchScores: !!creatorId
      };
    } catch (error) {
      console.error('Search campaigns error:', error);
      return {
        success: false,
        error: error.message,
        campaigns: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1, hasMore: false }
      };
    }
  }

  /**
   * Build campaign search query
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Object} MongoDB query
   */
  buildCampaignQuery(filters, options = {}) {
    const { includeExpired = false } = options;
    const query = {};

    // Text search
    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: 'i' } },
        { description: { $regex: filters.q, $options: 'i' } }
      ];
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    } else if (!includeExpired) {
      // By default, only show active campaigns
      query.status = 'active';
    }

    // Category filters
    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.categories?.length) {
      query.category = { $in: filters.categories };
    }

    // Budget filters
    if (filters.minBudget || filters.maxBudget) {
      query.budget = {};
      if (filters.minBudget) query.budget.$gte = parseFloat(filters.minBudget);
      if (filters.maxBudget) query.budget.$lte = parseFloat(filters.maxBudget);
    }

    if (filters.budgetRange) {
      const [min, max] = filters.budgetRange.split('-').map(Number);
      query.budget = { $gte: min, $lte: max };
    }

    // Platform filters
    if (filters.platform) {
      query['targetAudience.platforms'] = filters.platform;
    }

    if (filters.platforms?.length) {
      query['targetAudience.platforms'] = { $in: filters.platforms };
    }

    // Niche filters
    if (filters.niche) {
      query['targetAudience.niches'] = filters.niche;
    }

    if (filters.niches?.length) {
      query['targetAudience.niches'] = { $in: filters.niches };
    }

    // Date filters
    if (filters.startDate) {
      query.startDate = { $gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      query.endDate = { $lte: new Date(filters.endDate) };
    }

    if (filters.dateRange) {
      const now = new Date();
      switch (filters.dateRange) {
        case 'today':
          query.endDate = { $gte: now };
          break;
        case 'week':
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() + 7);
          query.endDate = { $lte: weekEnd, $gte: now };
          break;
        case 'month':
          const monthEnd = new Date();
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          query.endDate = { $lte: monthEnd, $gte: now };
          break;
      }
    }

    // Target audience filters
    if (filters.minFollowers) {
      query['targetAudience.minFollowers'] = { $lte: filters.minFollowers };
    }

    if (filters.maxFollowers) {
      query['targetAudience.maxFollowers'] = { $gte: filters.maxFollowers };
    }

    if (filters.minEngagement) {
      query['targetAudience.minEngagement'] = { $lte: filters.minEngagement };
    }

    if (filters.location) {
      query['targetAudience.locations'] = filters.location;
    }

    // Exclude specific campaigns
    if (filters.excludeIds?.length) {
      query._id = { $nin: filters.excludeIds };
    }

    // Exclude campaigns the creator has already applied to
    if (filters.excludeApplied && filters.creatorId) {
      query['applications.creatorId'] = { $ne: filters.creatorId };
    }

    return query;
  }

  /**
   * Calculate match scores for campaigns against a creator
   * @param {Array} campaigns - List of campaigns
   * @param {Object} creator - Creator object
   * @returns {Promise<Array>} Campaigns with match scores
   */
  async calculateCampaignMatchScores(campaigns, creator) {
    const campaignsWithScores = await Promise.all(
      campaigns.map(async (campaign) => {
        const matchScore = await MatchEngine.calculateCampaignMatch(campaign, creator);
        return {
          ...campaign,
          matchScore: matchScore.score,
          matchLevel: matchScore.level,
          matchReason: matchScore.reason,
          matchBreakdown: matchScore.breakdown
        };
      })
    );

    return campaignsWithScores;
  }

  /**
   * Apply sorting to campaigns
   * @param {Array} campaigns - List of campaigns
   * @param {string} sortBy - Sort field
   * @returns {Array} Sorted campaigns
   */
  applyCampaignSorting(campaigns, sortBy) {
    switch (sortBy) {
      case 'budget_desc':
        return campaigns.sort((a, b) => (b.budget || 0) - (a.budget || 0));
      
      case 'budget_asc':
        return campaigns.sort((a, b) => (a.budget || 0) - (b.budget || 0));
      
      case 'deadline_asc':
        return campaigns.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      
      case 'oldest':
        return campaigns.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      case 'newest':
      default:
        return campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  // ==================== SUGGESTIONS ====================

  /**
   * Get search suggestions
   * @param {string} query - Search query
   * @param {string} type - Suggestion type (creators, campaigns, brands, niches)
   * @returns {Promise<Array>}
   */
  async getSuggestions(query, type = 'all') {
    try {
      if (!query || query.length < 2) {
        return { success: true, suggestions: [] };
      }

      const cacheKey = `suggestions:${query}:${type}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return { success: true, suggestions: cached, fromCache: true };
      }

      const suggestions = [];
      const regex = new RegExp(query, 'i');

      // Search creators
      if (type === 'all' || type === 'creators') {
        const creators = await Creator.find({
          $or: [
            { displayName: regex },
            { handle: regex }
          ]
        })
          .select('displayName handle profilePicture totalFollowers niches')
          .limit(5)
          .lean();

        suggestions.push(...creators.map(c => ({
          type: 'creator',
          id: c._id,
          name: c.displayName,
          handle: c.handle,
          image: c.profilePicture,
          followers: c.totalFollowers,
          niches: c.niches,
          url: `/creators/${c._id}`
        })));
      }

      // Search campaigns
      if (type === 'all' || type === 'campaigns') {
        const campaigns = await Campaign.find({
          status: 'active',
          title: regex
        })
          .select('title budget category')
          .populate('brandId', 'brandName')
          .limit(5)
          .lean();

        suggestions.push(...campaigns.map(c => ({
          type: 'campaign',
          id: c._id,
          title: c.title,
          brand: c.brandId?.brandName,
          budget: c.budget,
          category: c.category,
          url: `/campaigns/${c._id}`
        })));
      }

      // Search brands
      if (type === 'all' || type === 'brands') {
        const brands = await Brand.find({
          brandName: regex
        })
          .select('brandName logo industry')
          .limit(5)
          .lean();

        suggestions.push(...brands.map(b => ({
          type: 'brand',
          id: b._id,
          name: b.brandName,
          image: b.logo,
          industry: b.industry,
          url: `/brands/${b._id}`
        })));
      }

      // Search niches
      if (type === 'all' || type === 'niches') {
        const niches = [
          'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech',
          'Gaming', 'Lifestyle', 'Parenting', 'Finance', 'Education',
          'Entertainment', 'Sports', 'Music', 'Art', 'Photography'
        ];
        
        const matchingNiches = niches.filter(niche => 
          niche.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5).map(niche => ({
          type: 'niche',
          name: niche,
          url: `/search?niche=${encodeURIComponent(niche)}`
        }));
        
        suggestions.push(...matchingNiches);
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, suggestions, 3600);

      return { success: true, suggestions };
    } catch (error) {
      console.error('Get suggestions error:', error);
      return { success: false, error: error.message, suggestions: [] };
    }
  }

  // ==================== TRENDING SEARCHES ====================

  /**
   * Get trending searches
   * @param {number} limit - Number of trending items
   * @returns {Promise<Object>}
   */
  async getTrendingSearches(limit = 10) {
    try {
      const SearchHistory = require('../models/SearchHistory');
      
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Get current week searches
      const currentWeek = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: '$searchTerm',
            count: { $sum: 1 },
            users: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            term: '$_id',
            count: 1,
            uniqueUsers: { $size: '$users' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      // Get previous week searches
      const previousWeek = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: '$searchTerm',
            count: { $sum: 1 }
          }
        }
      ]);

      const previousWeekMap = {};
      previousWeek.forEach(item => {
        previousWeekMap[item._id] = item.count;
      });

      // Calculate trends
      const trending = currentWeek.map(current => {
        const previousCount = previousWeekMap[current.term] || 0;
        const growth = previousCount > 0 
          ? ((current.count - previousCount) / previousCount) * 100
          : 100;

        return {
          term: current.term,
          count: current.count,
          uniqueUsers: current.uniqueUsers,
          growth: Math.round(growth * 10) / 10,
          trending: growth > 50 ? '🔥' : growth > 20 ? '📈' : '📊'
        };
      });

      // Get popular niches
      const popularNiches = await this.getPopularNiches(limit);

      // Get popular categories
      const popularCategories = await this.getPopularCategories(limit);

      return {
        success: true,
        trending: trending.sort((a, b) => b.growth - a.growth),
        popularNiches,
        popularCategories
      };
    } catch (error) {
      console.error('Get trending searches error:', error);
      return { success: false, error: error.message, trending: [] };
    }
  }

  /**
   * Get popular niches
   * @param {number} limit - Number of items
   * @returns {Promise<Array>}
   */
  async getPopularNiches(limit = 10) {
    const niches = await Creator.aggregate([
      { $unwind: '$niches' },
      {
        $group: {
          _id: '$niches',
          count: { $sum: 1 },
          avgEngagement: { $avg: '$averageEngagement' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          niche: '$_id',
          count: 1,
          avgEngagement: { $round: ['$avgEngagement', 2] }
        }
      }
    ]);

    return niches;
  }

  /**
   * Get popular campaign categories
   * @param {number} limit - Number of items
   * @returns {Promise<Array>}
   */
  async getPopularCategories(limit = 10) {
    const categories = await Campaign.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgBudget: { $avg: '$budget' },
          totalBudget: { $sum: '$budget' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgBudget: { $round: ['$avgBudget', 2] },
          totalBudget: 1
        }
      }
    ]);

    return categories;
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Get personalized recommendations for user
   * @param {string} userId - User ID
   * @param {string} userType - User type (brand/creator)
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Object>}
   */
  async getRecommendations(userId, userType, limit = 10) {
    try {
      const cacheKey = `recommendations:${userId}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return { success: true, recommendations: cached, fromCache: true };
      }

      let recommendations = [];

      if (userType === 'brand') {
        recommendations = await this.getBrandRecommendations(userId, limit);
      } else if (userType === 'creator') {
        recommendations = await this.getCreatorRecommendations(userId, limit);
      }

      // Cache for 6 hours
      await cacheService.set(cacheKey, recommendations, 21600);

      return {
        success: true,
        recommendations
      };
    } catch (error) {
      console.error('Get recommendations error:', error);
      return { success: false, error: error.message, recommendations: [] };
    }
  }

  /**
   * Get recommendations for brand
   * @param {string} brandId - Brand ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>}
   */
  async getBrandRecommendations(brandId, limit = 10) {
    // Get brand details
    const brand = await Brand.findById(brandId).lean();
    
    if (!brand) return [];

    // Get brand's past campaigns
    const pastCampaigns = await Campaign.find({ brandId })
      .select('category targetAudience')
      .lean();

    const pastCategories = [...new Set(pastCampaigns.map(c => c.category).filter(Boolean))];
    const pastNiches = [];
    
    pastCampaigns.forEach(c => {
      if (c.targetAudience?.niches) {
        pastNiches.push(...c.targetAudience.niches);
      }
    });

    const uniquePastNiches = [...new Set(pastNiches)];

    // Find similar creators
    const query = {
      isVerified: true,
      'availability.status': 'available'
    };

    // Match based on past categories/niches
    if (pastCategories.length > 0 || uniquePastNiches.length > 0) {
      query.$or = [];
      
      if (pastCategories.length > 0) {
        query.$or.push({ niches: { $in: pastCategories } });
      }
      
      if (uniquePastNiches.length > 0) {
        query.$or.push({ niches: { $in: uniquePastNiches } });
      }
    } else if (brand.industry) {
      // Fallback to brand's industry
      query.niches = brand.industry;
    }

    let creators = await Creator.find(query)
      .select('displayName handle profilePicture totalFollowers averageEngagement stats')
      .limit(limit * 2) // Get more for scoring
      .lean();

    // Calculate match scores
    creators = await Promise.all(
      creators.map(async (creator) => {
        const score = await MatchEngine.calculateBrandMatch(creator, brand);
        return {
          ...creator,
          matchScore: score.score,
          matchReason: score.reason,
          matchBreakdown: score.breakdown
        };
      })
    );

    // Sort by match score and return top results
    return creators
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Get recommendations for creator
   * @param {string} creatorId - Creator ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>}
   */
  async getCreatorRecommendations(creatorId, limit = 10) {
    // Get creator details
    const creator = await Creator.findById(creatorId).lean();
    
    if (!creator) return [];

    // Get creator's past deals
    const pastDeals = await Deal.find({ 
      creatorId, 
      status: 'completed' 
    }).populate('campaignId').lean();

    const pastCategories = [];
    const pastBrands = [];

    pastDeals.forEach(deal => {
      if (deal.campaignId?.category) {
        pastCategories.push(deal.campaignId.category);
      }
      if (deal.brandId) {
        pastBrands.push(deal.brandId);
      }
    });

    const uniqueCategories = [...new Set(pastCategories)];

    // Find recommended campaigns
    const query = {
      status: 'active'
    };

    // Match based on creator's niches and past categories
    if (creator.niches?.length > 0 || uniqueCategories.length > 0) {
      query.$or = [];
      
      if (creator.niches?.length > 0) {
        query.$or.push({ 'targetAudience.niches': { $in: creator.niches } });
      }
      
      if (uniqueCategories.length > 0) {
        query.$or.push({ category: { $in: uniqueCategories } });
      }
    } else if (creator.primaryPlatform) {
      // Fallback to primary platform
      query['targetAudience.platforms'] = creator.primaryPlatform;
    }

    // Exclude campaigns already applied to
    query['applications.creatorId'] = { $ne: creatorId };

    let campaigns = await Campaign.find(query)
      .populate('brandId', 'brandName logo')
      .limit(limit * 2)
      .lean();

    // Calculate match scores
    campaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const score = await MatchEngine.calculateCampaignMatch(campaign, creator);
        return {
          ...campaign,
          matchScore: score.score,
          matchLevel: score.level,
          matchReason: score.reason,
          matchBreakdown: score.breakdown
        };
      })
    );

    // Sort by match score and return top results
    return campaigns
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // ==================== SAVED SEARCHES ====================

  /**
   * Save a search for user
   * @param {string} userId - User ID
   * @param {string} name - Search name
   * @param {Object} filters - Search filters
   * @param {boolean} notify - Whether to notify on new results
   * @returns {Promise<Object>}
   */
  async saveSearch(userId, name, filters, notify = false) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const savedSearch = await SavedSearch.create({
        userId,
        name,
        filters,
        notify,
        createdAt: new Date()
      });

      return {
        success: true,
        savedSearch
      };
    } catch (error) {
      console.error('Save search error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get saved searches for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getSavedSearches(userId) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const searches = await SavedSearch.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        searches
      };
    } catch (error) {
      console.error('Get saved searches error:', error);
      return { success: false, error: error.message, searches: [] };
    }
  }

  /**
   * Update saved search
   * @param {string} searchId - Search ID
   * @param {string} userId - User ID
   * @param {Object} updates - Updates
   * @returns {Promise<Object>}
   */
  async updateSavedSearch(searchId, userId, updates) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const savedSearch = await SavedSearch.findOneAndUpdate(
        { _id: searchId, userId },
        { $set: updates },
        { new: true }
      );

      if (!savedSearch) {
        return { success: false, error: 'Saved search not found' };
      }

      return {
        success: true,
        savedSearch
      };
    } catch (error) {
      console.error('Update saved search error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete saved search
   * @param {string} searchId - Search ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteSavedSearch(searchId, userId) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const result = await SavedSearch.findOneAndDelete({
        _id: searchId,
        userId
      });

      if (!result) {
        return { success: false, error: 'Saved search not found' };
      }

      return {
        success: true,
        message: 'Search deleted successfully'
      };
    } catch (error) {
      console.error('Delete saved search error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== SEARCH HISTORY ====================

  /**
   * Record search history
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Applied filters
   * @param {string} ipAddress - IP address
   */
  async recordSearch(userId, searchTerm, filters = {}, ipAddress = null) {
    try {
      const SearchHistory = require('../models/SearchHistory');
      
      await SearchHistory.create({
        userId,
        searchTerm,
        filters,
        ipAddress,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Record search error:', error);
    }
  }

  /**
   * Get search history for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of history items
   * @returns {Promise<Object>}
   */
  async getSearchHistory(userId, limit = 20) {
    try {
      const SearchHistory = require('../models/SearchHistory');
      
      const history = await SearchHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        history
      };
    } catch (error) {
      console.error('Get search history error:', error);
      return { success: false, error: error.message, history: [] };
    }
  }

  /**
   * Clear search history for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async clearSearchHistory(userId) {
    try {
      const SearchHistory = require('../models/SearchHistory');
      
      await SearchHistory.deleteMany({ userId });

      return {
        success: true,
        message: 'Search history cleared'
      };
    } catch (error) {
      console.error('Clear search history error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== SEARCH ANALYTICS ====================

  /**
   * Get search analytics (admin only)
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>}
   */
  async getSearchAnalytics(options = {}) {
    try {
      const { period = '30d', startDate, endDate } = options;
      const SearchHistory = require('../models/SearchHistory');

      let start = new Date();
      let end = new Date();

      if (period === '7d') {
        start.setDate(start.getDate() - 7);
      } else if (period === '30d') {
        start.setDate(start.getDate() - 30);
      } else if (period === '90d') {
        start.setDate(start.getDate() - 90);
      } else if (period === 'custom' && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      }

      // Top searches
      const topSearches = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$searchTerm',
            count: { $sum: 1 },
            users: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            term: '$_id',
            count: 1,
            uniqueUsers: { $size: '$users' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Searches over time
      const searchesOverTime = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Searches by user type
      const searchesByUserType = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $group: {
            _id: '$user.userType',
            count: { $sum: 1 }
          }
        }
      ]);

      // No result searches
      const noResultSearches = await SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            hasResults: false
          }
        },
        {
          $group: {
            _id: '$searchTerm',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        success: true,
        analytics: {
          period,
          totalSearches: await SearchHistory.countDocuments({
            createdAt: { $gte: start, $lte: end }
          }),
          uniqueSearchers: await SearchHistory.distinct('userId', {
            createdAt: { $gte: start, $lte: end }
          }).then(users => users.length),
          topSearches,
          searchesOverTime: searchesOverTime.map(item => ({
            date: `${item._id.year}-${item._id.month}-${item._id.day}`,
            count: item.count
          })),
          searchesByUserType,
          noResultSearches
        }
      };
    } catch (error) {
      console.error('Get search analytics error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SearchService();