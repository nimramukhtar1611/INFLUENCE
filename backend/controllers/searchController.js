// controllers/searchController.js - COMPLETE FIXED VERSION
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Brand = require('../models/Brand');
const MatchEngine = require('../services/matchEngine');
const SearchService = require('../services/searchService');
const asyncHandler = require('express-async-handler');
const cacheService = require('../services/cacheService');

// @desc    Search creators with weighted matching
// @route   GET /api/search/creators
// @access  Private
const searchCreators = asyncHandler(async (req, res) => {
  const {
    q,
    niche,
    minFollowers,
    maxFollowers,
    minEngagement,
    platform,
    location,
    verified,
    available,
    campaignId, // For campaign-specific matching
    sort = 'relevance',
    page = 1,
    limit = 20
  } = req.query;

  // Check cache first
  const cacheKey = `search:creators:${JSON.stringify(req.query)}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      ...cached,
      fromCache: true
    });
  }

  const query = {};

  // Text search
  if (q) {
    query.$or = [
      { displayName: { $regex: q, $options: 'i' } },
      { handle: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } }
    ];
  }

  // Basic filters
  if (niche) {
    query.niches = { $in: Array.isArray(niche) ? niche : [niche] };
  }

  if (minFollowers || maxFollowers) {
    query.totalFollowers = {};
    if (minFollowers) query.totalFollowers.$gte = parseInt(minFollowers);
    if (maxFollowers) query.totalFollowers.$lte = parseInt(maxFollowers);
  }

  if (minEngagement) {
    query.averageEngagement = { $gte: parseFloat(minEngagement) };
  }

  if (platform) {
    const platformQuery = {};
    platformQuery[`socialMedia.${platform}`] = { $exists: true };
    Object.assign(query, platformQuery);
  }

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (verified === 'true') {
    query.isVerified = true;
  }

  if (available === 'true') {
    query['availability.status'] = 'available';
  }

  // Get creators
  const creators = await Creator.find(query)
    .select('-paymentMethods -stripeAccountId -payoutSettings')
    .lean();

  // If campaign ID provided, calculate match scores
  if (campaignId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (campaign) {
      // Calculate match scores for each creator
      const creatorsWithScores = await Promise.all(
        creators.map(async (creator) => {
          const matchScore = await MatchEngine.calculateMatchScore(creator, campaign);
          return {
            ...creator,
            matchScore: matchScore.score,
            matchBreakdown: matchScore.breakdown
          };
        })
      );

      // Sort by match score
      creatorsWithScores.sort((a, b) => b.matchScore - a.matchScore);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedCreators = creatorsWithScores.slice(startIndex, endIndex);

      const result = {
        creators: paginatedCreators,
        total: creators.length,
        totalPages: Math.ceil(creators.length / limit),
        currentPage: page,
        hasMatchScores: true
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, result, 300);

      return res.json({
        success: true,
        ...result
      });
    }
  }

  // Regular search without matching
  let sortOption = {};
  switch (sort) {
    case 'followers_desc':
      sortOption = { totalFollowers: -1 };
      break;
    case 'followers_asc':
      sortOption = { totalFollowers: 1 };
      break;
    case 'engagement_desc':
      sortOption = { averageEngagement: -1 };
      break;
    case 'engagement_asc':
      sortOption = { averageEngagement: 1 };
      break;
    case 'rating_desc':
      sortOption = { 'stats.averageRating': -1 };
      break;
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    default:
      sortOption = { totalFollowers: -1 };
  }

  const paginatedCreators = await Creator.find(query)
    .select('-paymentMethods -stripeAccountId -payoutSettings')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Creator.countDocuments(query);

  const result = {
    creators: paginatedCreators,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hasMatchScores: false
  };

  // Cache for 5 minutes
  await cacheService.set(cacheKey, result, 300);

  res.json({
    success: true,
    ...result
  });
});

// @desc    Search campaigns
// @route   GET /api/search/campaigns
// @access  Private
const searchCampaigns = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    minBudget,
    maxBudget,
    platform,
    status = 'active',
    sort = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  const cacheKey = `search:campaigns:${JSON.stringify(req.query)}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      ...cached,
      fromCache: true
    });
  }

  const query = { status };

  // Text search
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }

  // Filters
  if (category) {
    query.category = category;
  }

  if (minBudget || maxBudget) {
    query.budget = {};
    if (minBudget) query.budget.$gte = parseInt(minBudget);
    if (maxBudget) query.budget.$lte = parseInt(maxBudget);
  }

  if (platform) {
    query['targetAudience.platforms'] = platform;
  }

  // Determine sort
  let sortOption = {};
  switch (sort) {
    case 'budget_desc':
      sortOption = { budget: -1 };
      break;
    case 'budget_asc':
      sortOption = { budget: 1 };
      break;
    case 'deadline_asc':
      sortOption = { deadline: 1 };
      break;
    case 'newest':
    default:
      sortOption = { createdAt: -1 };
  }

  const campaigns = await Campaign.find(query)
    .populate('brandId', 'brandName logo')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Campaign.countDocuments(query);

  // Calculate match scores if creator is logged in
  if (req.user && req.user.userType === 'creator') {
    const creator = await Creator.findById(req.user._id).lean();
    if (creator) {
      const campaignsWithScores = await Promise.all(
        campaigns.map(async (campaign) => {
          const matchScore = await MatchEngine.calculateCampaignMatch(campaign, creator);
          return {
            ...campaign,
            matchScore: matchScore.score,
            matchBreakdown: matchScore.breakdown
          };
        })
      );

      campaignsWithScores.sort((a, b) => b.matchScore - a.matchScore);

      const result = {
        campaigns: campaignsWithScores,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasMatchScores: true
      };

      await cacheService.set(cacheKey, result, 300);

      return res.json({
        success: true,
        ...result
      });
    }
  }

  const result = {
    campaigns,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hasMatchScores: false
  };

  await cacheService.set(cacheKey, result, 300);

  res.json({
    success: true,
    ...result
  });
});

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Private
const getSuggestions = asyncHandler(async (req, res) => {
  const { q, type } = req.query;

  if (!q || q.length < 2) {
    return res.json({ success: true, suggestions: [] });
  }

  const cacheKey = `search:suggestions:${q}:${type || 'all'}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      suggestions: cached,
      fromCache: true
    });
  }

  const suggestions = [];

  // Search creators
  if (!type || type === 'creators') {
    const creators = await Creator.find({
      $or: [
        { displayName: { $regex: q, $options: 'i' } },
        { handle: { $regex: q, $options: 'i' } }
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
      niches: c.niches
    })));
  }

  // Search campaigns
  if (!type || type === 'campaigns') {
    const campaigns = await Campaign.find({
      status: 'active',
      title: { $regex: q, $options: 'i' }
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
      category: c.category
    })));
  }

  // Search brands
  if (!type || type === 'brands') {
    const brands = await Brand.find({
      brandName: { $regex: q, $options: 'i' }
    })
      .select('brandName logo industry')
      .limit(5)
      .lean();

    suggestions.push(...brands.map(b => ({
      type: 'brand',
      id: b._id,
      name: b.brandName,
      image: b.logo,
      industry: b.industry
    })));
  }

  // Search niches
  if (!type || type === 'niches') {
    const niches = require('../utils/constants').NICHES;
    const matchingNiches = niches.filter(niche => 
      niche.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5).map(niche => ({
      type: 'niche',
      name: niche
    }));
    
    suggestions.push(...matchingNiches);
  }

  // Cache for 1 hour
  await cacheService.set(cacheKey, suggestions, 3600);

  res.json({
    success: true,
    suggestions
  });
});

// @desc    Save search
// @route   POST /api/search/save
// @access  Private
const saveSearch = asyncHandler(async (req, res) => {
  const { name, filters, notify } = req.body;

  const SavedSearch = require('../models/SavedSearch');
  
  const savedSearch = await SavedSearch.create({
    userId: req.user._id,
    name,
    filters,
    notify: notify || false,
    createdAt: new Date()
  });

  res.json({
    success: true,
    message: 'Search saved successfully',
    savedSearch
  });
});

// @desc    Get saved searches
// @route   GET /api/search/saved
// @access  Private
const getSavedSearches = asyncHandler(async (req, res) => {
  const SavedSearch = require('../models/SavedSearch');
  
  const searches = await SavedSearch.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    searches
  });
});

// @desc    Delete saved search
// @route   DELETE /api/search/saved/:searchId
// @access  Private
const deleteSavedSearch = asyncHandler(async (req, res) => {
  const SavedSearch = require('../models/SavedSearch');
  
  await SavedSearch.findOneAndDelete({
    _id: req.params.searchId,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Search deleted successfully'
  });
});

// @desc    Update saved search
// @route   PUT /api/search/saved/:searchId
// @access  Private
const updateSavedSearch = asyncHandler(async (req, res) => {
  const SavedSearch = require('../models/SavedSearch');
  
  const savedSearch = await SavedSearch.findOneAndUpdate(
    {
      _id: req.params.searchId,
      userId: req.user._id
    },
    { $set: req.body },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Search updated successfully',
    savedSearch
  });
});

// @desc    Get search history
// @route   GET /api/search/history
// @access  Private
const getSearchHistory = asyncHandler(async (req, res) => {
  const SearchHistory = require('../models/SearchHistory');
  
  const history = await SearchHistory.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    history
  });
});

// @desc    Clear search history
// @route   DELETE /api/search/history
// @access  Private
const clearSearchHistory = asyncHandler(async (req, res) => {
  const SearchHistory = require('../models/SearchHistory');
  
  await SearchHistory.deleteMany({ userId: req.user._id });

  res.json({
    success: true,
    message: 'Search history cleared'
  });
});

// @desc    Get search analytics
// @route   GET /api/search/analytics
// @access  Private/Admin
const getSearchAnalytics = asyncHandler(async (req, res) => {
  const SearchHistory = require('../models/SearchHistory');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const analytics = await SearchHistory.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
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
        searchTerm: '$_id',
        count: 1,
        uniqueUsers: { $size: '$users' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  res.json({
    success: true,
    analytics: {
      topSearches: analytics,
      totalSearches: await SearchHistory.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      })
    }
  });
});

// @desc    Get trending searches
// @route   GET /api/search/trending
// @access  Private
const getTrendingSearches = asyncHandler(async (req, res) => {
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
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
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

  // Calculate trends
  const trending = currentWeek.map(current => {
    const previous = previousWeek.find(p => p._id === current._id);
    const previousCount = previous?.count || 0;
    const growth = previousCount > 0 
      ? ((current.count - previousCount) / previousCount) * 100
      : 100;

    return {
      term: current._id,
      count: current.count,
      growth: Math.round(growth * 10) / 10,
      trending: growth > 50 ? '🔥' : growth > 20 ? '📈' : '📊'
    };
  });

  res.json({
    success: true,
    trending: trending.sort((a, b) => b.growth - a.growth)
  });
});

// @desc    Get recommendations
// @route   GET /api/search/recommendations
// @access  Private
const getRecommendations = asyncHandler(async (req, res) => {
  const cacheKey = `recommendations:${req.user._id}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      recommendations: cached,
      fromCache: true
    });
  }

  let recommendations = [];

  if (req.user.userType === 'brand') {
    // Get brand's industry and past campaigns
    const brand = await Brand.findById(req.user._id).lean();
    const pastDeals = await Deal.find({ 
      brandId: req.user._id,
      status: 'completed'
    }).populate('creatorId');

    // Get creators they've worked with
    const pastCreatorIds = pastDeals.map(d => d.creatorId._id);

    // Find similar creators
    recommendations = await Creator.find({
      _id: { $nin: pastCreatorIds },
      niches: { $in: [brand.industry] },
      'availability.status': 'available',
      isVerified: true
    })
      .select('displayName handle profilePicture totalFollowers averageEngagement stats.averageRating')
      .sort({ totalFollowers: -1 })
      .limit(10)
      .lean();

    // Add match scores
    recommendations = await Promise.all(
      recommendations.map(async (creator) => {
        const score = await MatchEngine.calculateBrandMatch(creator, brand);
        return {
          ...creator,
          matchScore: score.score,
          reason: score.reason
        };
      })
    );

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

  } else if (req.user.userType === 'creator') {
    // Get creator's niches and past deals
    const creator = await Creator.findById(req.user._id).lean();
    const pastDeals = await Deal.find({ 
      creatorId: req.user._id,
      status: 'completed'
    }).populate('campaignId');

    // Get past campaign categories
    const pastCategories = pastDeals.map(d => d.campaignId?.category).filter(Boolean);

    // Recommend campaigns
    recommendations = await Campaign.find({
      status: 'active',
      'targetAudience.niches': { $in: creator.niches },
      category: { $in: pastCategories.length ? pastCategories : creator.niches }
    })
      .populate('brandId', 'brandName logo')
      .sort({ budget: -1 })
      .limit(10)
      .lean();

    // Add match scores
    recommendations = await Promise.all(
      recommendations.map(async (campaign) => {
        const score = await MatchEngine.calculateCampaignMatch(campaign, creator);
        return {
          ...campaign,
          matchScore: score.score,
          matchBreakdown: score.breakdown,
          reason: score.reason
        };
      })
    );

    recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Cache for 6 hours
  await cacheService.set(cacheKey, recommendations, 21600);

  res.json({
    success: true,
    recommendations
  });
});

module.exports = {
  searchCreators,
  searchCampaigns,
  getSuggestions,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  updateSavedSearch,
  getSearchHistory,
  clearSearchHistory,
  getSearchAnalytics,
  getTrendingSearches,
  getRecommendations
};