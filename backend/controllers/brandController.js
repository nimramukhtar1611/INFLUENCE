// controllers/brandController.js - COMPLETE PRODUCTION-READY VERSION
const Brand = require('../models/Brand');
const User = require('../models/User');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Invitation = require('../models/Invitation');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { catchAsync } = require('../utils/catchAsync');

const getBrandContextId = (req) => req.brandId || req.user?._id;

const getBrandSubscriptionPlan = async (brandUserId) => {
  if (!brandUserId) return 'free';

  const subscription = await Subscription.findOne({
    userId: brandUserId,
    status: { $in: ['active', 'trialing'] }
  })
    .select('planId')
    .lean();

  return String(subscription?.planId || 'free').toLowerCase();
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

const normalizeList = (values = []) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean);
};

const getCampaignMatchingProfile = (campaign, filters = {}) => {
  const budget = Number(campaign?.budget || 0);
  const deriveFollowerRangeFromBudget = () => {
    if (budget <= 0) return { min: 5000, max: 200000, source: 'default' };

    // Continuous mapping so each campaign budget can produce a different follower target band.
    const idealFollowers = clamp(Math.round(budget * 120), 1500, 5000000);
    const min = clamp(Math.round(idealFollowers * 0.45), 1000, 4000000);
    const max = clamp(Math.round(idealFollowers * 1.9), min + 1000, 7000000);

    return { min, max, source: 'budget_continuous' };
  };

  const targetMinFollowers = Number(campaign?.targetAudience?.minFollowers || filters.minFollowers || 0);
  const targetMaxFollowers = Number(campaign?.targetAudience?.maxFollowers || filters.maxFollowers || 0);
  const derivedRange = deriveFollowerRangeFromBudget();

  const minFollowers = targetMinFollowers > 0 ? targetMinFollowers : derivedRange.min;
  const maxFollowers = targetMaxFollowers > 0 ? targetMaxFollowers : derivedRange.max;

  const targetNiches = normalizeList([
    campaign?.category,
    ...(campaign?.targetAudience?.niches || []),
    ...(filters.niche ? [filters.niche] : [])
  ]);

  const targetPlatforms = normalizeList([
    ...(campaign?.targetAudience?.platforms || []),
    ...(filters.platform ? [filters.platform] : [])
  ]);

  return {
    primaryCategory: normalizeText(campaign?.category || ''),
    niches: [...new Set(targetNiches)],
    platforms: [...new Set(targetPlatforms)],
    minEngagement: Number(campaign?.targetAudience?.minEngagement || filters.minEngagement || 0),
    minFollowers,
    maxFollowers,
    followerRangeSource: (targetMinFollowers > 0 || targetMaxFollowers > 0) ? 'target_audience' : derivedRange.source
  };
};

const computeNicheScore = (creator, profile) => {
  const creatorNiches = new Set(normalizeList(creator?.niches || []));
  const primaryCategory = normalizeText(profile?.primaryCategory || '');

  // Exact campaign category match gets full niche component.
  if (primaryCategory && creatorNiches.has(primaryCategory)) {
    return { score: 100, overlap: [primaryCategory] };
  }

  const targetNiches = profile.niches;
  if (!targetNiches.length) {
    return { score: creatorNiches.size > 0 ? 70 : 50, overlap: [] };
  }

  const overlap = targetNiches.filter((niche) => creatorNiches.has(niche));
  if (overlap.length === 0) {
    // Explicit niche/type mismatch should still score low, not zero.
    return { score: 20, overlap: [] };
  }

  const coverage = overlap.length / targetNiches.length;
  return {
    score: Math.round(clamp(coverage * 100, 0, 100)),
    overlap
  };
};

const computeEngagementScore = (creator, profile) => {
  const avgEngagement = Number(creator?.averageEngagement || 0);
  const followers = Number(creator?.totalFollowers || 0);
  const target = Math.max(Number(profile.minEngagement || 0), 0);

  let engagementScore = 0;
  if (target > 0) {
    engagementScore = clamp((avgEngagement / target) * 100, 0, 100);
  } else {
    engagementScore = clamp(avgEngagement * 20, 0, 100);
  }

  if (profile.minFollowers > 0 && followers < profile.minFollowers) {
    engagementScore *= 0.85;
  }

  if (profile.maxFollowers > 0 && followers > profile.maxFollowers) {
    engagementScore *= 0.9;
  }

  return Math.round(clamp(engagementScore, 0, 100));
};

const computeFollowerScore = (creator, profile) => {
  const followers = Number(creator?.totalFollowers || 0);
  const minFollowers = Number(profile?.minFollowers || 0);
  const maxFollowers = Number(profile?.maxFollowers || 0);
  const reachStrength = clamp(Math.log10(Math.max(followers, 10)) / 7, 0, 1);
  const reachBonus = Math.round(reachStrength * 25);

  if (minFollowers <= 0 && maxFollowers <= 0) {
    // Log-scaled score for no constraints.
    const logScore = Math.log10(Math.max(followers, 10)) * 20;
    return Math.round(clamp(logScore, 0, 100));
  }

  if (maxFollowers > 0 && followers > maxFollowers) {
    const overshootRatio = (followers - maxFollowers) / Math.max(maxFollowers, 1);
    const fitScore = clamp(100 - (overshootRatio * 20), 45, 100);
    return Math.round(clamp((fitScore * 0.75) + reachBonus, 0, 100));
  }

  if (minFollowers > 0 && followers < minFollowers) {
    const shortfallRatio = (minFollowers - followers) / Math.max(minFollowers, 1);
    const fitScore = clamp(100 - (shortfallRatio * 90), 0, 100);
    return Math.round(clamp((fitScore * 0.8) + (reachBonus * 0.5), 0, 100));
  }

  // Inside target range: reward proximity to range midpoint.
  const low = minFollowers > 0 ? minFollowers : 0;
  const high = maxFollowers > 0 ? maxFollowers : Math.max(low * 3, 100000);
  const midpoint = (low + high) / 2;
  const halfRange = Math.max((high - low) / 2, 1);
  const distance = Math.abs(followers - midpoint);
  const proximity = 1 - (distance / halfRange);

  const fitScore = clamp(75 + (proximity * 25), 60, 100);
  return Math.round(clamp((fitScore * 0.8) + reachBonus, 0, 100));
};

const computeBehavioralScore = (creator, creatorDealStats = {}) => {
  const completed = Number(creatorDealStats.completed || 0);
  const cancelled = Number(creatorDealStats.cancelled || 0);
  const disputed = Number(creatorDealStats.disputed || 0);
  const revision = Number(creatorDealStats.revision || 0);
  const totalDeals = Number(creatorDealStats.total || 0);
  const rating = Number(creator?.stats?.averageRating || 0);

  if (totalDeals === 0) {
    const coldStart = 65 + clamp(rating, 0, 5) * 4;
    return Math.round(clamp(coldStart, 0, 100));
  }

  const completionRate = completed / totalDeals;
  const cancellationRate = cancelled / totalDeals;
  const disputeRate = disputed / totalDeals;
  const revisionRate = revision / totalDeals;

  const completionScore = completionRate * 100;
  const reliabilityPenalty = (cancellationRate * 30) + (disputeRate * 40) + (revisionRate * 15);
  const ratingScore = clamp((rating / 5) * 100, 0, 100);

  const weighted = (completionScore * 0.6) + (ratingScore * 0.25) + ((100 - reliabilityPenalty) * 0.15);
  return Math.round(clamp(weighted, 0, 100));
};

const computeDataQualityScore = (creator = {}) => {
  const followers = Number(creator?.totalFollowers || 0);
  const engagement = Number(creator?.averageEngagement || 0);
  const socialMedia = creator?.socialMedia || {};
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter'];

  const connectedPlatforms = platforms.filter((platform) => {
    const social = socialMedia?.[platform] || {};
    const handle = typeof social?.handle === 'string' ? social.handle.trim() : '';
    const url = typeof social?.url === 'string' ? social.url.trim() : '';
    const followersCount = Number(social?.followers || social?.subscribers || 0);
    return Boolean(handle || url || followersCount > 0);
  }).length;

  let score = 0;
  if (followers > 0) score += 50;
  if (engagement > 0) score += 25;
  score += (connectedPlatforms / platforms.length) * 25;

  return Math.round(clamp(score, 0, 100));
};

const buildAiMatch = (creator, profile, creatorDealStats = {}) => {
  const niche = computeNicheScore(creator, profile);
  const engagement = computeEngagementScore(creator, profile);
  const followers = computeFollowerScore(creator, profile);
  const behavioral = computeBehavioralScore(creator, creatorDealStats);
  const dataQuality = computeDataQualityScore(creator);
  const otherSignals = Math.round(
    clamp((engagement * 0.4) + (behavioral * 0.4) + (dataQuality * 0.2), 0, 100)
  );

  const matchScore = Math.round(
    clamp(
      (followers * 0.4) +
      (niche.score * 0.4) +
      (otherSignals * 0.2),
      0,
      100
    )
  );
  let successProbability = Math.round(
    clamp((matchScore * 0.7) + (otherSignals * 0.3), 5, 95)
  );

  // Low data confidence should never appear as strong success odds.
  if (dataQuality < 30) {
    successProbability = Math.min(successProbability, 28);
  }

  const reasons = [];
  if (dataQuality < 35) {
    reasons.push('Limited verified audience data lowers confidence');
  }
  if (niche.overlap.length > 0) {
    reasons.push(`Niche overlap: ${niche.overlap.slice(0, 2).join(', ')}`);
  }
  if (followers >= 80) reasons.push('Follower range strongly aligns with campaign scale');
  if (engagement >= 75) reasons.push('Strong engagement fit for campaign goals');
  if (behavioral >= 75) reasons.push('Reliable past delivery behavior');
  if (!reasons.length) reasons.push('Balanced fit across campaign constraints');

  return {
    score: matchScore,
    successProbability,
    components: {
      niche: niche.score,
      engagement,
      followers,
      behavioral,
      dataQuality,
      otherSignals
    },
    reasons
  };
};

const normalizeHandle = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/^@+/, '').replace(/\/$/, '');
};

const extractHandleFromUrl = (value, platform) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.includes('http://') && !trimmed.includes('https://')) {
    return normalizeHandle(trimmed);
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';

    if (platform === 'instagram') {
      return normalizeHandle(parts[0]);
    }

    if (platform === 'twitter') {
      if (parts[0] === 'intent' || parts[0] === 'share') {
        return '';
      }
      return normalizeHandle(parts[0]);
    }

    return trimmed;
  } catch (error) {
    return normalizeHandle(trimmed);
  }
};

// ==================== PROFILE MANAGEMENT ====================

exports.getProfile = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req))
    .select('-password -refreshToken')
    .populate('teamMembers.userId', 'fullName email profilePicture')
    .populate('teamMembers.invitedBy', 'fullName email')
    .populate('teamInvitations.invitedBy', 'fullName email');

  if (!brand) {
    return res.status(404).json({ success: false, error: 'Brand profile not found' });
  }

  res.json({ success: true, brand });
});

/**
 * @desc    Update brand profile
 * @route   PUT /api/brands/profile
 * @access  Private/Brand
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'brandName',
      'industry',
      'website',
      'description',
      'founded',
      'employees',
      'companySize',
      'businessType',
      'taxId',
      'logo',
      'coverImage',
      'phone',
      'email',
      'address',
      'socialMedia',
      'preferences'
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    if (updateData.socialMedia && typeof updateData.socialMedia === 'object') {
      updateData.socialMedia = {
        ...updateData.socialMedia,
        ...(updateData.socialMedia.instagram !== undefined
          ? { instagram: extractHandleFromUrl(updateData.socialMedia.instagram, 'instagram') }
          : {}),
        ...(updateData.socialMedia.twitter !== undefined
          ? { twitter: extractHandleFromUrl(updateData.socialMedia.twitter, 'twitter') }
          : {})
      };
    }

    const brand = await Brand.findByIdAndUpdate(
      getBrandContextId(req),
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      brand
    });
  } catch (error) {
    console.error('Brand update profile error:', error);

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({
        success: false,
        error: firstError?.message || 'Validation failed'
      });
    }

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        error: `${duplicateField} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update brand profile'
    });
  }
};

// ==================== DASHBOARD ====================

/**
 * @desc    Get brand dashboard data
 * @route   GET /api/brands/dashboard
 * @access  Private/Brand
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const brandId = getBrandContextId(req);

  const [campaigns, deals, payments, recentActivity] = await Promise.all([
    Campaign.find({ brandId }).sort('-createdAt').limit(5).select('title status budget spent progress'),
    Deal.find({ brandId })
      .populate('creatorId', 'displayName profilePicture')
      .populate('campaignId', 'title')
      .sort('-createdAt')
      .limit(5),
    Payment.find({ 'from.userId': brandId }).sort('-createdAt').limit(5),
    getRecentActivity(brandId),
  ]);

  const stats = {
    totalCampaigns: await Campaign.countDocuments({ brandId }),
    activeCampaigns: await Campaign.countDocuments({ brandId, status: 'active' }),
    totalDeals: await Deal.countDocuments({ brandId }),
    pendingDeals: await Deal.countDocuments({ brandId, status: 'pending' }),
    activeTeamMembers: (await Brand.findById(brandId).select('teamMembers'))?.teamMembers?.filter(m => m.status === 'active').length || 0,
  };

  res.json({
    success: true,
    campaigns,
    deals,
    payments,
    recentActivity,
    stats,
  });
});

// Helper to get recent activity for dashboard
async function getRecentActivity(brandId) {
  const activities = [];

  // Campaign updates
  const campaigns = await Campaign.find({ brandId })
    .sort('-updatedAt')
    .limit(3)
    .select('title status updatedAt');
  campaigns.forEach(c => {
    activities.push({
      type: 'campaign',
      action: c.status === 'active' ? 'published' : 'updated',
      title: c.title,
      timestamp: c.updatedAt,
    });
  });

  // Deal updates
  const deals = await Deal.find({ brandId })
    .populate('creatorId', 'displayName')
    .sort('-updatedAt')
    .limit(3);
  deals.forEach(d => {
    activities.push({
      type: 'deal',
      action: d.status,
      title: `Deal with ${d.creatorId?.displayName || 'Creator'}`,
      timestamp: d.updatedAt,
    });
  });

  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
}

// ==================== ANALYTICS ====================

/**
 * @desc    Get brand analytics
 * @route   GET /api/brands/analytics
 * @access  Private/Brand
 */
exports.getAnalytics = catchAsync(async (req, res) => {
  const { period = '30d' } = req.query;
  const brandId = getBrandContextId(req);

  let startDate = new Date();
  switch (period) {
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
    case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
    default: startDate.setDate(startDate.getDate() - 30);
  }

  const [campaignPerformance, platformDistribution, topCreators, summary] = await Promise.all([
    Campaign.aggregate([
      { $match: { brandId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          campaigns: { $sum: 1 },
          spent: { $sum: '$spent' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    Deal.aggregate([
      { $match: { brandId } },
      { $unwind: '$deliverables' },
      {
        $group: {
          _id: '$deliverables.platform',
          count: { $sum: 1 },
          spend: { $sum: '$deliverables.budget' },
        },
      },
    ]),
    Deal.aggregate([
      { $match: { brandId, status: 'completed' } },
      {
        $group: {
          _id: '$creatorId',
          deals: { $sum: 1 },
          totalSpent: { $sum: '$budget' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: '$creator' },
    ]),
    {
      totalCampaigns: await Campaign.countDocuments({ brandId }),
      activeCampaigns: await Campaign.countDocuments({ brandId, status: 'active' }),
      totalDeals: await Deal.countDocuments({ brandId }),
      completedDeals: await Deal.countDocuments({ brandId, status: 'completed' }),
      totalSpent: await Deal.aggregate([
        { $match: { brandId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$budget' } } },
      ]).then(r => r[0]?.total || 0),
      avgROI: 0, // placeholder; can be calculated from deals with metrics
    },
  ]);

  res.json({
    success: true,
    analytics: {
      campaignPerformance,
      platformDistribution,
      topCreators,
      summary,
    },
  });
});

// ==================== CREATOR SEARCH ====================

/**
 * @desc    Search creators
 * @route   GET /api/brands/creators/search
 * @access  Private/Brand
 */
exports.searchCreators = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    niche,
    minFollowers,
    maxFollowers,
    minEngagement,
    platform,
    location,
    verified,
    available,
    q,
    sort = 'relevance',
    aiMatching = 'false',
    campaignId,
  } = req.query;

  const aiMatchingEnabled = String(aiMatching).toLowerCase() === 'true';
  const brandId = getBrandContextId(req);
  const currentPlan = await getBrandSubscriptionPlan(brandId);
  const canUseAiMatching = ['professional', 'enterprise'].includes(currentPlan);
  const aiMatchingRequested = aiMatchingEnabled || sort === 'ai_match' || Boolean(campaignId);
  const aiMatchingAllowed = aiMatchingRequested && canUseAiMatching;

  const query = { userType: 'creator', status: 'active' };

  // Text search
  if (q) {
    query.$or = [
      { displayName: { $regex: q, $options: 'i' } },
      { handle: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
    ];
  }

  // Niche filter
  if (niche) query.niches = { $in: [niche] };

  // Follower range
  if (minFollowers || maxFollowers) {
    query.totalFollowers = {};
    if (minFollowers) query.totalFollowers.$gte = parseInt(minFollowers);
    if (maxFollowers) query.totalFollowers.$lte = parseInt(maxFollowers);
  }

  // Engagement
  if (minEngagement) query.averageEngagement = { $gte: parseFloat(minEngagement) };

  // Platform
  if (platform) query[`socialMedia.${platform}.handle`] = { $exists: true };

  // Location
  if (location) query.location = { $regex: location, $options: 'i' };

  // Verification
  if (verified === 'true') query.isVerified = true;

  // Availability
  if (available === 'true') query['availability.status'] = 'available';

  // Sorting
  let sortOption = {};
  const effectiveSort = sort === 'ai_match' && !canUseAiMatching ? 'relevance' : sort;
  switch (effectiveSort) {
    case 'followers_desc': sortOption = { totalFollowers: -1 }; break;
    case 'followers_asc': sortOption = { totalFollowers: 1 }; break;
    case 'engagement_desc': sortOption = { averageEngagement: -1 }; break;
    case 'rating_desc': sortOption = { 'stats.averageRating': -1 }; break;
    case 'newest': sortOption = { createdAt: -1 }; break;
    case 'ai_match': sortOption = { totalFollowers: -1 }; break;
    default: sortOption = { totalFollowers: -1 };
  }

  let campaign = null;
  if (campaignId && canUseAiMatching) {
    campaign = await Campaign.findOne({ _id: campaignId, brandId })
      .select('title category targetAudience budget')
      .lean();

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found for this brand context' });
    }
  }

  const matchingProfile = getCampaignMatchingProfile(campaign, { niche, platform, minEngagement, minFollowers, maxFollowers });

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Creator.countDocuments(query);
  let creators = await Creator.find(query)
    .select('displayName handle profilePicture niches totalFollowers averageEngagement stats location socialMedia')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  if (aiMatchingAllowed) {
    const creatorIds = creators.map((creator) => creator._id).filter(Boolean);
    const creatorDealStats = await Deal.aggregate([
      { $match: { creatorId: { $in: creatorIds } } },
      {
        $group: {
          _id: '$creatorId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
          revision: { $sum: { $cond: [{ $eq: ['$status', 'revision'] }, 1, 0] } }
        }
      }
    ]);

    const statsByCreator = new Map(
      creatorDealStats.map((entry) => [String(entry._id), entry])
    );

    creators = creators.map((creator) => {
      const aiMatch = buildAiMatch(creator, matchingProfile, statsByCreator.get(String(creator._id)) || {});
      return { ...creator, aiMatch };
    });

    creators.sort((a, b) => {
      const scoreDiff = Number(b.aiMatch?.score || 0) - Number(a.aiMatch?.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(b.totalFollowers || 0) - Number(a.totalFollowers || 0);
    });
  }

  res.json({
    success: true,
    creators,
    aiMatching: aiMatchingAllowed,
    aiMatchingEntitlement: {
      canUse: canUseAiMatching,
      currentPlan,
      requiredPlan: 'professional',
      reason: canUseAiMatching
        ? ''
        : 'AI Creator Matching Engine is available on Professional plan and above'
    },
    campaignContext: campaign
      ? {
          id: campaign._id,
          title: campaign.title,
          category: campaign.category
        }
      : null,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get creator details by ID
 * @route   GET /api/brands/creators/:id
 * @access  Private/Brand
 */
exports.getCreatorById = catchAsync(async (req, res) => {
  const creator = await Creator.findById(req.params.id)
    .select('-paymentMethods -stripeAccountId -payoutSettings -twoFactorSecret')
    .lean();

  if (!creator) {
    return res.status(404).json({ success: false, error: 'Creator not found' });
  }

  const completedDealsQuery = { creatorId: creator._id, status: 'completed' };

  const [recentDeals, completedDealsCount, completedDealsForEngagement] = await Promise.all([
    Deal.find(completedDealsQuery)
      .populate('campaignId', 'title')
      .sort('-completedAt')
      .limit(5)
      .lean(),
    Deal.countDocuments(completedDealsQuery),
    Deal.find(completedDealsQuery)
      .select('metrics deliverables')
      .lean(),
  ]);

  // Fallback follower total in case aggregate field was not recalculated recently.
  const computedFollowers = creator.totalFollowers || [
    creator.socialMedia?.instagram?.followers || 0,
    creator.socialMedia?.youtube?.subscribers || 0,
    creator.socialMedia?.tiktok?.followers || 0,
    creator.socialMedia?.twitter?.followers || 0,
  ].reduce((sum, value) => sum + Number(value || 0), 0);

  // Derive engagement from completed deal performance metrics when available.
  let totalImpressions = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  for (const deal of completedDealsForEngagement) {
    const metrics = deal.metrics || {};
    totalImpressions += Number(metrics.impressions || 0);
    totalLikes += Number(metrics.likes || 0);
    totalComments += Number(metrics.comments || 0);
    totalShares += Number(metrics.shares || 0);

    for (const deliverable of deal.deliverables || []) {
      const performance = deliverable.performance || {};
      totalImpressions += Number(performance.impressions || 0);
      totalLikes += Number(performance.likes || 0);
      totalComments += Number(performance.comments || 0);
      totalShares += Number(performance.shares || 0);
    }
  }

  const engagementFromDeals = totalImpressions > 0
    ? ((totalLikes + totalComments + totalShares) / totalImpressions) * 100
    : 0;

  const normalizedEngagement = engagementFromDeals > 0
    ? Number(engagementFromDeals.toFixed(2))
    : Number(creator.averageEngagement || 0);

  const normalizedStats = {
    ...(creator.stats || {}),
    completedDeals: completedDealsCount,
    completedCampaigns: Math.max(Number(creator.stats?.completedCampaigns || 0), completedDealsCount),
    averageRating: Number(creator.stats?.averageRating || 0),
    totalReviews: Number(creator.stats?.totalReviews || 0),
  };

  res.json({
    success: true,
    creator: {
      ...creator,
      totalFollowers: computedFollowers,
      averageEngagement: normalizedEngagement,
      stats: normalizedStats,
      recentDeals,
    },
  });
});

// ==================== TEAM MANAGEMENT ====================

/**
 * @desc    Get team members
 * @route   GET /api/brands/team
 * @access  Private/Brand
 */
exports.getTeamMembers = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req))
    .populate('teamMembers.userId', 'fullName email profilePicture lastActive')
    .populate('teamMembers.invitedBy', 'fullName email');

  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Only accepted team members belong in the members table.
  const visibleMembers = brand.teamMembers.filter(
    (m) => m.status === 'active' || m.status === 'inactive'
  );
  res.json({ success: true, teamMembers: visibleMembers });
});

/**
 * @desc    Get single team member details
 * @route   GET /api/brands/team/:memberId
 * @access  Private/Brand
 */
exports.getTeamMemberDetails = catchAsync(async (req, res) => {
  const brandId = getBrandContextId(req);
  const brand = await Brand.findById(brandId);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(req.params.memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  await member.populate('userId', 'fullName email profilePicture phone lastActive createdAt');
  await member.populate('invitedBy', 'fullName email');

  const [campaigns, deals, totalCampaigns, totalDeals] = await Promise.all([
    Campaign.find({ brandId, createdBy: member.userId._id }).sort('-createdAt').limit(5),
    Deal.find({ brandId, createdBy: member.userId._id }).sort('-createdAt').limit(5),
    Campaign.countDocuments({ brandId, createdBy: member.userId._id }),
    Deal.countDocuments({ brandId, createdBy: member.userId._id }),
  ]);

  res.json({
    success: true,
    member,
    activity: { campaigns, deals, totalCampaigns, totalDeals },
  });
});

/**
 * @desc    Add team member (invite existing user)
 * @route   POST /api/brands/team
 * @access  Private/Brand
 */
exports.addTeamMember = catchAsync(async (req, res) => {
  const { email, role = 'member', permissions = [] } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Check if user exists
  const user = await User.findOne({ email: normalizedEmail });
  if (user) {
    // Check if already a member
    const existingMember = brand.teamMembers.find(
      m => m.userId?.toString() === user._id.toString() && m.status !== 'removed'
    );
    if (existingMember) {
      return res.status(400).json({ success: false, error: 'User is already a team member' });
    }

    const existingPendingInvitation = brand.teamInvitations.find(
      (inv) => inv.email?.toLowerCase() === normalizedEmail && inv.status === 'pending'
    );

    if (existingPendingInvitation) {
      return res.status(400).json({ success: false, error: 'An invitation is already pending for this email' });
    }

    // Existing users now follow invitation flow as well.
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = {
      email: normalizedEmail,
      role,
      permissions,
      invitedBy: req.user._id,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      token,
      status: 'pending',
    };
    brand.teamInvitations.push(invitation);
    await brand.save();

    // Notify user without blocking the invite flow if notification delivery fails.
    try {
      await Notification.create({
        userId: user._id,
        type: 'team',
        title: 'Team Invitation',
        message: `You have been invited to join ${brand.brandName}'s team as ${role}`,
        data: { brandId: brand._id, token },
      });
    } catch (notificationError) {
      console.error('Team member notification failed:', notificationError.message);
    }
  } else {
    const existingPendingInvitation = brand.teamInvitations.find(
      (inv) => inv.email?.toLowerCase() === normalizedEmail && inv.status === 'pending'
    );

    if (existingPendingInvitation) {
      return res.status(400).json({ success: false, error: 'An invitation is already pending for this email' });
    }

    // Send invitation to non-existing user
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = {
      email: normalizedEmail,
      role,
      permissions,
      invitedBy: req.user._id,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      token,
      status: 'pending',
    };
    brand.teamInvitations.push(invitation);
    await brand.save();

    // TODO: Send invitation email
  }

  res.json({
    success: true,
    message: 'Invitation sent',
    teamMembers: brand.teamMembers,
    invitations: brand.teamInvitations.filter((inv) => inv.status === 'pending'),
  });
});

/**
 * @desc    Update team member role
 * @route   PUT /api/brands/team/:memberId/role
 * @access  Private/Brand
 */
exports.updateTeamMemberRole = catchAsync(async (req, res) => {
  const { memberId } = req.params;
  const { role } = req.body;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  member.role = role;
  await brand.save();

  res.json({ success: true, message: 'Role updated', member });
});

/**
 * @desc    Update team member permissions
 * @route   PUT /api/brands/team/:memberId/permissions
 * @access  Private/Brand
 */
exports.updateTeamMemberPermissions = catchAsync(async (req, res) => {
  const { memberId } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: 'Permissions must be an array' });
  }

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  member.permissions = permissions;
  await brand.save();

  res.json({ success: true, message: 'Permissions updated', member });
});

/**
 * @desc    Remove team member
 * @route   DELETE /api/brands/team/:memberId
 * @access  Private/Brand
 */
exports.removeTeamMember = catchAsync(async (req, res) => {
  const { memberId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const memberIndex = brand.teamMembers.findIndex(m => m._id.toString() === memberId);
  if (memberIndex === -1) return res.status(404).json({ success: false, error: 'Team member not found' });

  brand.teamMembers.splice(memberIndex, 1);
  await brand.save();

  res.json({ success: true, message: 'Team member removed' });
});

// ==================== TEAM INVITATIONS ====================

/**
 * @desc    Get pending invitations
 * @route   GET /api/brands/team/invitations
 * @access  Private/Brand
 */
exports.getInvitations = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const pending = brand.teamInvitations.filter(i => i.status === 'pending');
  res.json({ success: true, invitations: pending });
});

/**
 * @desc    Send invitation (alias for addTeamMember)
 * @route   POST /api/brands/team/invitations
 * @access  Private/Brand
 */
exports.sendInvitation = exports.addTeamMember;

/**
 * @desc    Resend invitation
 * @route   POST /api/brands/team/invitations/:invitationId/resend
 * @access  Private/Brand
 */
exports.resendInvitation = catchAsync(async (req, res) => {
  const { invitationId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const invitation = brand.teamInvitations.id(invitationId);
  if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

  if (invitation.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Invitation is no longer pending' });
  }

  // Regenerate token and expiry
  invitation.token = crypto.randomBytes(32).toString('hex');
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invitation.resentAt = new Date();
  await brand.save();

  // TODO: Resend email

  res.json({ success: true, message: 'Invitation resent' });
});

/**
 * @desc    Cancel invitation
 * @route   DELETE /api/brands/team/invitations/:invitationId
 * @access  Private/Brand
 */
exports.cancelInvitation = catchAsync(async (req, res) => {
  const { invitationId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const invitation = brand.teamInvitations.id(invitationId);
  if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

  invitation.status = 'cancelled';
  await brand.save();

  res.json({ success: true, message: 'Invitation cancelled' });
});

/**
 * @desc    Accept invitation (public route)
 * @route   POST /api/brands/team/invitations/accept
 * @access  Public
 */
exports.acceptInvitation = catchAsync(async (req, res) => {
  const { token, userId } = req.body;

  if (!token || !userId) {
    return res.status(400).json({ success: false, error: 'Invitation token and user ID are required' });
  }

  const brand = await Brand.findOne({ 'teamInvitations.token': token });
  if (!brand) return res.status(404).json({ success: false, error: 'Invalid invitation token' });

  const invitation = brand.teamInvitations.find(i => i.token === token);
  if (!invitation || invitation.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Invitation not valid' });
  }

  if (new Date() > invitation.expiresAt) {
    invitation.status = 'expired';
    await brand.save();
    return res.status(400).json({ success: false, error: 'Invitation expired' });
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  if (String(user.email || '').toLowerCase() !== String(invitation.email || '').toLowerCase()) {
    return res.status(403).json({ success: false, error: 'This invitation is not assigned to your account email' });
  }

  const existingMember = brand.teamMembers.find(
    (m) => m.userId?.toString() === user._id.toString() && m.status !== 'removed'
  );

  if (existingMember) {
    existingMember.role = invitation.role || existingMember.role;
    if (Array.isArray(invitation.permissions) && invitation.permissions.length > 0) {
      existingMember.permissions = invitation.permissions;
    }
    existingMember.joinedAt = existingMember.joinedAt || new Date();
    existingMember.status = 'active';
    existingMember.lastActive = new Date();
  } else {
    // Add as team member
    brand.teamMembers.push({
      userId: user._id,
      role: invitation.role,
      permissions: invitation.permissions,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      joinedAt: new Date(),
      status: 'active',
    });
  }

  invitation.status = 'accepted';
  await brand.save();

  await Notification.updateMany(
    {
      userId: user._id,
      type: 'team',
      'data.token': token
    },
    {
      $set: {
        'data.invitationStatus': 'accepted',
        read: true,
        readAt: new Date()
      }
    }
  );

  res.json({ success: true, message: 'Invitation accepted' });
});

/**
 * @desc    Reject invitation (public route)
 * @route   POST /api/brands/team/invitations/reject
 * @access  Public
 */
exports.rejectInvitation = catchAsync(async (req, res) => {
  const { token, userId } = req.body;

  if (!token || !userId) {
    return res.status(400).json({ success: false, error: 'Invitation token and user ID are required' });
  }

  const brand = await Brand.findOne({ 'teamInvitations.token': token });
  if (!brand) return res.status(404).json({ success: false, error: 'Invalid invitation token' });

  const invitation = brand.teamInvitations.find(i => i.token === token);
  if (!invitation || invitation.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Invitation not valid' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  if (String(user.email || '').toLowerCase() !== String(invitation.email || '').toLowerCase()) {
    return res.status(403).json({ success: false, error: 'This invitation is not assigned to your account email' });
  }

  invitation.status = 'cancelled';
  await brand.save();

  await Notification.updateMany(
    {
      userId: user._id,
      type: 'team',
      'data.token': token
    },
    {
      $set: {
        'data.invitationStatus': 'rejected',
        read: true,
        readAt: new Date()
      }
    }
  );

  res.json({ success: true, message: 'Invitation rejected' });
});

// ==================== TEAM ACTIVITY ====================

/**
 * @desc    Get team activity log
 * @route   GET /api/brands/team/activity
 * @access  Private/Brand
 */
exports.getTeamActivity = catchAsync(async (req, res) => {
  const { days = 30, page = 1, limit = 20 } = req.query;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const activities = await brand.getTeamActivityLog(parseInt(days));

  // Paginate results
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedActivities = activities.slice(startIndex, endIndex);

  res.json({
    success: true,
    activities: paginatedActivities,
    pagination: {
      total: activities.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(activities.length / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get permissions summary for current user
 * @route   GET /api/brands/team/permissions/summary
 * @access  Private/Brand
 */
exports.getPermissionsSummary = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Brand owner has all permissions
  const allPermissions = [
    'view_campaigns', 'create_campaigns', 'edit_campaigns', 'delete_campaigns',
    'view_deals', 'create_deals', 'edit_deals', 'approve_deals',
    'view_payments', 'process_payments', 'view_analytics', 'manage_team',
    'manage_settings', 'view_creators', 'invite_creators', 'contact_creators',
  ];

  // Check if the user is the brand owner (primary account)
  const isOwner = brand._id.toString() === req.user._id.toString();

  if (isOwner) {
    return res.json({
      success: true,
      role: 'owner',
      permissions: allPermissions,
      isOwner: true,
    });
  }

  // Otherwise, find user in team members
  const member = brand.teamMembers.find(
    m => m.userId.toString() === req.user._id.toString() && m.status === 'active'
  );

  if (!member) {
    return res.status(403).json({ success: false, error: 'You are not an active team member of this brand' });
  }

  res.json({
    success: true,
    role: member.role,
    permissions: member.role === 'admin' ? allPermissions : member.permissions,
    isOwner: false,
  });
});

/**
 * @desc    Check if user has a specific permission
 * @route   POST /api/brands/team/check-permission
 * @access  Private/Brand
 */
exports.checkUserPermission = catchAsync(async (req, res) => {
  const { permission, userId } = req.body;

  if (!permission) {
    return res.status(400).json({ success: false, error: 'Permission name is required' });
  }

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Check the target user (default to the requesting user)
  const targetUserId = userId || req.user._id;

  // Brand owner always has permission
  const isOwner = brand._id.toString() === targetUserId.toString();
  if (isOwner) {
    return res.json({ success: true, hasPermission: true, role: 'owner' });
  }

  const hasPermission = brand.userHasPermission(targetUserId, permission);
  const member = brand.teamMembers.find(
    m => m.userId.toString() === targetUserId.toString() && m.status === 'active'
  );

  res.json({
    success: true,
    hasPermission,
    role: member?.role || null,
    permission,
  });
});

// ==================== ROLE TEMPLATES ====================

/**
 * @desc    Get role templates
 * @route   GET /api/brands/team/role-templates
 * @access  Private/Brand
 */
exports.getRoleTemplates = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Include built-in defaults alongside custom templates
  const builtInTemplates = [
    {
      _id: 'admin',
      name: 'Admin',
      description: 'Full access to all features',
      permissions: brand.getDefaultPermissionsForRole('admin'),
      isDefault: true,
      isBuiltIn: true,
    },
    {
      _id: 'manager',
      name: 'Manager',
      description: 'Can manage campaigns, deals, and view analytics',
      permissions: brand.getDefaultPermissionsForRole('manager'),
      isDefault: true,
      isBuiltIn: true,
    },
    {
      _id: 'member',
      name: 'Member',
      description: 'Can create and edit campaigns and deals',
      permissions: brand.getDefaultPermissionsForRole('member'),
      isDefault: true,
      isBuiltIn: true,
    },
    {
      _id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to campaigns, deals, and analytics',
      permissions: brand.getDefaultPermissionsForRole('viewer'),
      isDefault: true,
      isBuiltIn: true,
    },
  ];

  res.json({
    success: true,
    templates: [...builtInTemplates, ...brand.roleTemplates],
  });
});

/**
 * @desc    Create a custom role template
 * @route   POST /api/brands/team/role-templates
 * @access  Private/Brand
 */
exports.createRoleTemplate = catchAsync(async (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name || !permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Name and at least one permission are required',
    });
  }

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Check for duplicate name
  const duplicateName = brand.roleTemplates.find(
    t => t.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicateName) {
    return res.status(400).json({ success: false, error: 'A role template with this name already exists' });
  }

  brand.roleTemplates.push({
    name,
    description: description || '',
    permissions,
    isDefault: false,
  });

  await brand.save();

  const newTemplate = brand.roleTemplates[brand.roleTemplates.length - 1];

  res.status(201).json({
    success: true,
    message: 'Role template created',
    template: newTemplate,
  });
});

/**
 * @desc    Update a custom role template
 * @route   PUT /api/brands/team/role-templates/:templateId
 * @access  Private/Brand
 */
exports.updateRoleTemplate = catchAsync(async (req, res) => {
  const { templateId } = req.params;
  const { name, description, permissions } = req.body;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const template = brand.roleTemplates.id(templateId);
  if (!template) {
    return res.status(404).json({ success: false, error: 'Role template not found' });
  }

  if (template.isDefault) {
    return res.status(400).json({ success: false, error: 'Cannot modify a built-in role template' });
  }

  // Check for duplicate name (excluding current template)
  if (name) {
    const duplicate = brand.roleTemplates.find(
      t => t.name.toLowerCase() === name.toLowerCase() && t._id.toString() !== templateId
    );
    if (duplicate) {
      return res.status(400).json({ success: false, error: 'A role template with this name already exists' });
    }
    template.name = name;
  }

  if (description !== undefined) template.description = description;
  if (permissions && Array.isArray(permissions)) template.permissions = permissions;

  await brand.save();

  res.json({
    success: true,
    message: 'Role template updated',
    template,
  });
});

/**
 * @desc    Delete a custom role template
 * @route   DELETE /api/brands/team/role-templates/:templateId
 * @access  Private/Brand
 */
exports.deleteRoleTemplate = catchAsync(async (req, res) => {
  const { templateId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const template = brand.roleTemplates.id(templateId);
  if (!template) {
    return res.status(404).json({ success: false, error: 'Role template not found' });
  }

  if (template.isDefault) {
    return res.status(400).json({ success: false, error: 'Cannot delete a built-in role template' });
  }

  brand.roleTemplates.pull(templateId);
  await brand.save();

  res.json({ success: true, message: 'Role template deleted' });
});

// ==================== TEAM MEMBER STATUS ====================

/**
 * @desc    Update team member status (activate/deactivate)
 * @route   PUT /api/brands/team/:memberId/status
 * @access  Private/Brand
 */
exports.updateTeamMemberStatus = catchAsync(async (req, res) => {
  const { memberId } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Status must be "active" or "inactive"',
    });
  }

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(memberId);
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team member not found' });
  }

  if (member.status === 'removed') {
    return res.status(400).json({ success: false, error: 'Cannot change status of a removed member' });
  }

  if (member.status === 'pending') {
    return res.status(400).json({ success: false, error: 'Pending members must accept invitations before activation' });
  }

  const previousStatus = member.status;
  member.status = status;
  if (status === 'active') member.lastActive = new Date();

  await brand.save();

  // Populate the member user info for the response
  await brand.populate('teamMembers.userId', 'fullName email');
  const updatedMember = brand.teamMembers.id(memberId);

  res.json({
    success: true,
    message: `Team member ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    member: updatedMember,
    previousStatus,
  });
});

// ==================== PAYMENT METHODS ====================

/**
 * @desc    Get payment methods
 * @route   GET /api/brands/payment-methods
 * @access  Private/Brand
 */
exports.getPaymentMethods = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req)).select('paymentMethods');
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  res.json({ success: true, paymentMethods: brand.paymentMethods || [] });
});

/**
 * @desc    Add payment method
 * @route   POST /api/brands/payment-methods
 * @access  Private/Brand
 */
exports.addPaymentMethod = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const newMethod = {
    _id: new mongoose.Types.ObjectId(),
    ...req.body,
    isDefault: false,
    createdAt: new Date(),
  };

  brand.paymentMethods.push(newMethod);
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

/**
 * @desc    Set default payment method
 * @route   PUT /api/brands/payment-methods/:methodId/default
 * @access  Private/Brand
 */
exports.setDefaultPaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Reset default flag on all methods
  brand.paymentMethods.forEach(m => (m.isDefault = false));

  const method = brand.paymentMethods.id(methodId);
  if (!method) return res.status(404).json({ success: false, error: 'Payment method not found' });

  method.isDefault = true;
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

/**
 * @desc    Delete payment method
 * @route   DELETE /api/brands/payment-methods/:methodId
 * @access  Private/Brand
 */
exports.deletePaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  brand.paymentMethods = brand.paymentMethods.filter(m => m._id.toString() !== methodId);
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

// ==================== INVOICES ====================

/**
 * @desc    Get invoices
 * @route   GET /api/brands/invoices
 * @access  Private/Brand
 */
exports.getInvoices = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const payments = await Payment.find({ 'from.userId': getBrandContextId(req) })
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('dealId', 'title')
    .lean();

  const total = await Payment.countDocuments({ 'from.userId': getBrandContextId(req) });

  res.json({
    success: true,
    invoices: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== TAX INFO ====================

/**
 * @desc    Get tax information
 * @route   GET /api/brands/tax-info
 * @access  Private/Brand
 */
exports.getTaxInfo = catchAsync(async (req, res) => {
  const brand = await Brand.findById(getBrandContextId(req)).select('taxInfo businessType taxId');
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  res.json({
    success: true,
    taxInfo: brand.taxInfo || {},
    businessType: brand.businessType,
    taxId: brand.taxId,
  });
});

/**
 * @desc    Update tax information
 * @route   PUT /api/brands/tax-info
 * @access  Private/Brand
 */
exports.updateTaxInfo = catchAsync(async (req, res) => {
  const { taxId, businessType, taxInfo } = req.body;

  const brand = await Brand.findById(getBrandContextId(req));
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  if (taxId !== undefined) brand.taxId = taxId;
  if (businessType !== undefined) brand.businessType = businessType;
  if (taxInfo !== undefined) brand.taxInfo = { ...brand.taxInfo, ...taxInfo };

  await brand.save();

  res.json({
    success: true,
    message: 'Tax information updated',
    taxId: brand.taxId,
    businessType: brand.businessType,
    taxInfo: brand.taxInfo,
  });
});