// controllers/creatorController.js - FULL FIXED VERSION
// Facebook removed. Instagram/YouTube/TikTok supported via handle + OAuth
const Creator = require('../models/Creator');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Campaign = require('../models/Campaign');
const socialService = require('../services/socialService'); // ✅ FIX: singleton instance

const CREATOR_EXCLUDED_EARNING_TYPES = ['withdrawal', 'refund', 'fee', 'penalty'];

// ==================== GET PROFILE ====================
exports.getProfile = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id)
      .select('-password -refreshToken -twoFactorSecret -resetPasswordToken -emailVerificationToken -socialTokens');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator profile not found' });
    }

    res.json({ success: true, creator });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get profile' });
  }
};

// ==================== UPDATE PROFILE ====================
exports.updateProfile = async (req, res) => {
   try {
    const allowedUpdates = ['displayName', 'handle', 'bio', 'location', 'website', 'birthday', 'gender', 'niches', 'rateCard', 'availability', 'privacy', 'notifications'];
    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -socialTokens');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully', creator });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
};

// ==================== VERIFY SOCIAL MEDIA (by handle) ====================
// Facebook removed — only Instagram, YouTube, TikTok, Twitter supported
exports.verifySocialMedia = async (req, res) => {
  try {
    const { platform, handle } = req.body;

    const supported = ['instagram', 'youtube', 'tiktok', 'twitter'];
    if (!supported.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Platform not supported. Supported: ${supported.join(', ')}`
      });
    }

    if (!handle) {
      return res.status(400).json({ success: false, error: 'Handle/username is required' });
    }

    // ✅ FIX: socialService is already a singleton instance — no `new` needed
    let result;
    switch (platform) {
      case 'instagram': result = await socialService.verifyInstagram(handle); break;
      case 'youtube':   result = await socialService.verifyYouTube(handle);   break;
      case 'tiktok':    result = await socialService.verifyTikTok(handle);    break;
      case 'twitter':   result = await socialService.verifyTwitter(handle);   break;
    }

    if (result.success) {
      const source = (result.data?.source || '').toLowerCase();
      const trustedSources = new Set(['rapidapi', 'youtube-api', 'tikwm', 'twitter-api', 'oauth']);
      const verified = trustedSources.has(source);
      const socialData = {
        ...result.data,
        verified,
        lastSynced: new Date()
      };

      // Save social media data to creator profile
      await Creator.findByIdAndUpdate(req.user._id, {
        $set: {
          [`socialMedia.${platform}`]:        socialData,
          [`socialVerification.${platform}`]: verified,
          lastSocialSync:                     new Date()
        }
      });

      // Trigger pre-save for totalFollowers recalculation
      const updatedCreator = await Creator.findById(req.user._id);
      await updatedCreator.save();

      const message = verified
        ? 'Account verified successfully'
        : (socialData.note
          ? `Account linked, but live stats could not be fully verified. ${socialData.note}`
          : 'Account linked, but live stats could not be fully verified. Connect API/OAuth for full verification.');

      res.json({
        success: true,
        message,
        verified,
        partial: !verified,
        source,
        data: socialData,
        stats: socialData
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to verify account' });
    }
  } catch (error) {
    console.error('Verify social media error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to verify account' });
  }
};

// ==================== SYNC ALL SOCIAL MEDIA ====================
exports.syncSocialMedia = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id);
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const platforms   = ['instagram', 'youtube', 'tiktok', 'twitter'];
    const syncResults = {};

    await Promise.allSettled(
      platforms.map(async (platform) => {
        const handle = creator.socialMedia?.[platform]?.handle;
        if (!handle) return;

        try {
          let result;
          switch (platform) {
            case 'instagram': result = await socialService.verifyInstagram(handle); break;
            case 'youtube':   result = await socialService.verifyYouTube(handle);   break;
            case 'tiktok':    result = await socialService.verifyTikTok(handle);    break;
            case 'twitter':   result = await socialService.verifyTwitter(handle);   break;
          }

          if (result?.success) {
            await Creator.findByIdAndUpdate(req.user._id, {
              $set: { [`socialMedia.${platform}`]: result.data }
            });
            syncResults[platform] = { success: true, data: result.data };
          } else {
            syncResults[platform] = { success: false, error: result?.error };
          }
        } catch (e) {
          syncResults[platform] = { success: false, error: e.message };
        }
      })
    );

    await Creator.findByIdAndUpdate(req.user._id, { lastSocialSync: new Date() });

    // Recalculate totals
    const updated = await Creator.findById(req.user._id);
    await updated.save();

    res.json({ success: true, message: 'Social media synced', results: syncResults });
  } catch (error) {
    console.error('Sync social media error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync' });
  }
};

// ==================== GET DASHBOARD ====================
exports.getDashboard = async (req, res) => {
  try {
    const creatorId = req.user._id;

    const [activeDeals, completedDealsCount, earnings, pendingEarnings, availableCampaigns] =
      await Promise.all([
        Deal.find({ creatorId, status: { $in: ['accepted', 'in-progress', 'revision'] } })
          .populate('brandId', 'brandName logo')
          .populate('campaignId', 'title')
          .sort('-createdAt')
          .limit(5),
        Deal.countDocuments({ creatorId, status: 'completed' }),
        Payment.aggregate([
          {
            $match: {
              'to.userId': creatorId,
              status: { $in: ['completed', 'available'] },
              type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
            }
          },
          {
            $match: {
              $expr: { $ne: ['$from.userId', '$to.userId'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Payment.aggregate([
          {
            $match: {
              'to.userId': creatorId,
              status: 'in-escrow',
              type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
            }
          },
          {
            $match: {
              $expr: { $ne: ['$from.userId', '$to.userId'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Campaign.countDocuments({
          status: 'active',
          'applications.creatorId': { $ne: creatorId }
        })
      ]);

    res.json({
      success: true,
      dashboard: {
        activeDeals,
        completedDeals:    completedDealsCount,
        totalEarnings:     earnings[0]?.total || 0,
        pendingEarnings:   pendingEarnings[0]?.total || 0,
        availableCampaigns,
        stats: {
          totalDeals:         await Deal.countDocuments({ creatorId }),
          activeDealsCount:   activeDeals.length,
          completedDealsCount
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get dashboard' });
  }
};

// ==================== GET ANALYTICS ====================
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const creatorId = req.user._id;

    const startDate = new Date();
    if (period === '7d')  startDate.setDate(startDate.getDate() - 7);
    if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    if (period === '12m') startDate.setFullYear(startDate.getFullYear() - 1);

    const creator = await Creator.findById(creatorId)
      .select('socialMedia stats totalFollowers averageEngagement portfolio displayName handle profilePicture');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    const completedDeals = await Deal.find({
      creatorId,
      status:    'completed',
      createdAt: { $gte: startDate }
    }).populate('brandId', 'brandName logo');

    // Aggregate metrics
    let totalImpressions = 0, totalLikes = 0, totalComments = 0;
    let totalShares = 0, totalClicks = 0, totalConversions = 0;

    completedDeals.forEach(deal => {
      const m = deal.metrics || {};
      totalImpressions  += m.impressions  || 0;
      totalLikes        += m.likes        || 0;
      totalComments     += m.comments     || 0;
      totalShares       += m.shares       || 0;
      totalClicks       += m.clicks       || 0;
      totalConversions  += m.conversions  || 0;

      deal.deliverables?.forEach(del => {
        const p = del.performance || {};
        totalImpressions  += p.impressions  || 0;
        totalLikes        += p.likes        || 0;
        totalComments     += p.comments     || 0;
        totalShares       += p.shares       || 0;
        totalClicks       += p.clicks       || 0;
        totalConversions  += p.conversions  || 0;
      });
    });

    const totalEngagements = totalLikes + totalComments + totalShares;
    const engagementRate   = totalImpressions > 0
      ? parseFloat(((totalEngagements / totalImpressions) * 100).toFixed(2))
      : 0;

    // Monthly earnings
    const monthlyMap = {};
    completedDeals.forEach(deal => {
      const d = new Date(deal.createdAt);
      const k = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (!monthlyMap[k]) monthlyMap[k] = { earnings: 0, deals: 0 };
      monthlyMap[k].earnings += deal.budget || 0;
      monthlyMap[k].deals    += 1;
    });

    const monthly = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const [am, ay] = a.month.split('/');
        const [bm, by] = b.month.split('/');
        return new Date(ay, am - 1) - new Date(by, bm - 1);
      });

    // Platform data — Facebook excluded
    const platformColors = { instagram: '#E1306C', youtube: '#FF0000', tiktok: '#010101', twitter: '#1DA1F2' };
    const platforms = ['instagram', 'youtube', 'tiktok', 'twitter']
      .filter(p => {
        const sm = creator.socialMedia?.[p];
        return sm && (sm.followers > 0 || sm.subscribers > 0);
      })
      .map(p => ({
        name:       p,
        followers:  creator.socialMedia[p].followers || creator.socialMedia[p].subscribers || 0,
        engagement: creator.socialMedia[p].engagement || 0,
        color:      platformColors[p]
      }));

    // Top brands
    const brandMap = {};
    completedDeals.forEach(deal => {
      if (deal.brandId) {
        const k = deal.brandId._id.toString();
        if (!brandMap[k]) brandMap[k] = { brand: deal.brandId, deals: 0, earnings: 0 };
        brandMap[k].deals    += 1;
        brandMap[k].earnings += deal.budget || 0;
      }
    });
    const topBrands = Object.values(brandMap).sort((a, b) => b.earnings - a.earnings).slice(0, 5);

    const totalEarnings = completedDeals.reduce((s, d) => s + (d.budget || 0), 0);

    res.json({
      success: true,
      analytics: {
        summary: {
          totalEarnings,
          totalDeals:       completedDeals.length,
          averageDealValue: completedDeals.length > 0 ? totalEarnings / completedDeals.length : 0,
          averageRating:    creator.stats?.averageRating || 0,
          totalFollowers:   creator.totalFollowers || 0,
          averageEngagement: engagementRate,
          completedDeals:   creator.stats?.completedCampaigns || 0
        },
        monthly,
        platforms,
        topBrands,
        engagement: {
          impressions: totalImpressions,
          likes:       totalLikes,
          comments:    totalComments,
          shares:      totalShares,
          clicks:      totalClicks,
          conversions: totalConversions,
          total:       totalEngagements,
          rate:        engagementRate
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get analytics' });
  }
};

// ==================== EARNINGS SUMMARY ====================
exports.getEarningsSummary = async (req, res) => {
  try {
    const creatorId = req.user._id;

    const startOfMonth    = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfLastMonth = new Date(); startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1); startOfLastMonth.setDate(1); startOfLastMonth.setHours(0, 0, 0, 0);
    const endOfLastMonth  = new Date(); endOfLastMonth.setDate(0); endOfLastMonth.setHours(23, 59, 59, 999);

    const [total, thisMonth, lastMonth, avgDeal] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
            createdAt: { $gte: startOfMonth }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            'to.userId': creatorId,
            status: { $in: ['completed', 'available'] },
            type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Deal.aggregate([{ $match: { creatorId, status: 'completed' } }, { $group: { _id: null, avg: { $avg: '$budget' } } }])
    ]);

    res.json({
      success: true,
      summary: {
        total:            total[0]?.total || 0,
        thisMonth:        thisMonth[0]?.total || 0,
        lastMonth:        lastMonth[0]?.total || 0,
        averageDealValue: avgDeal[0]?.avg || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EARNINGS HISTORY ====================
exports.getEarningsHistory = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const creatorId = req.user._id;

    const startDate = new Date();
    if (period === '7d')  startDate.setDate(startDate.getDate() - 7);
    if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    if (period === '12m') startDate.setFullYear(startDate.getFullYear() - 1);

    const history = await Payment.aggregate([
      {
        $match: {
          'to.userId': creatorId,
          status: { $in: ['completed', 'available'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES },
          createdAt: { $gte: startDate }
        }
      },
      { $match: { $expr: { $ne: ['$from.userId', '$to.userId'] } } },
      {
        $group: {
          _id:      { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          earnings: { $sum: '$netAmount' },
          count:    { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== PORTFOLIO ====================
exports.addPortfolioItem = async (req, res) => {
  try {
    const { title, description, mediaUrl, platform, brand, campaign, performance } = req.body;
 
    if (!title || !mediaUrl || !platform) {
      return res.status(400).json({
        success: false,
        error: 'title, mediaUrl, and platform are required'
      });
    }
 
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          portfolio: {
            title,
            description,
            mediaUrl,
            thumbnail: req.body.thumbnail || null,
            platform,
            brand,
            campaign,
            performance: performance || { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 },
            date: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    ).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }
 
    res.status(201).json({
      success: true,
      message: 'Portfolio item added',
      portfolio: creator.portfolio,
      // Return the newly added item (last in array)
      item: creator.portfolio[creator.portfolio.length - 1]
    });
  } catch (error) {
    console.error('Add portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to add portfolio item' });
  }
};
 
// ==================== UPDATE PORTFOLIO ITEM ====================
exports.updatePortfolioItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, description, mediaUrl, thumbnail, platform, brand, campaign, performance } = req.body;
 
    // Build the $set object with only the fields that were provided
    const updateFields = {};
    if (title       !== undefined) updateFields['portfolio.$.title']       = title;
    if (description !== undefined) updateFields['portfolio.$.description'] = description;
    if (mediaUrl    !== undefined) updateFields['portfolio.$.mediaUrl']    = mediaUrl;
    if (thumbnail   !== undefined) updateFields['portfolio.$.thumbnail']   = thumbnail;
    if (platform    !== undefined) updateFields['portfolio.$.platform']    = platform;
    if (brand       !== undefined) updateFields['portfolio.$.brand']       = brand;
    if (campaign    !== undefined) updateFields['portfolio.$.campaign']    = campaign;
 
    // Merge performance fields individually so a partial update doesn't zero out other metrics
    if (performance) {
      if (performance.views       !== undefined) updateFields['portfolio.$.performance.views']       = performance.views;
      if (performance.likes       !== undefined) updateFields['portfolio.$.performance.likes']       = performance.likes;
      if (performance.comments    !== undefined) updateFields['portfolio.$.performance.comments']    = performance.comments;
      if (performance.shares      !== undefined) updateFields['portfolio.$.performance.shares']      = performance.shares;
      if (performance.engagement  !== undefined) updateFields['portfolio.$.performance.engagement']  = performance.engagement;
    }
 
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided to update' });
    }
 
    const creator = await Creator.findOneAndUpdate(
      {
        _id: req.user._id,
        'portfolio._id': itemId   // positional operator matches this subdocument
      },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found or does not belong to you'
      });
    }
 
    const updatedItem = creator.portfolio.id(itemId);
 
    res.json({
      success: true,
      message: 'Portfolio item updated',
      portfolio: creator.portfolio,
      item: updatedItem
    });
  } catch (error) {
    console.error('Update portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update portfolio item' });
  }
};
 
// ==================== DELETE PORTFOLIO ITEM ====================
exports.deletePortfolioItem = async (req, res) => {
  try {
    const { itemId } = req.params;
 
    // First verify the item exists and belongs to this creator
    const creatorCheck = await Creator.findOne({
      _id: req.user._id,
      'portfolio._id': itemId
    });
 
    if (!creatorCheck) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found or does not belong to you'
      });
    }
 
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          portfolio: { _id: itemId }
        }
      },
      { new: true }
    ).select('portfolio');
 
    res.json({
      success: true,
      message: 'Portfolio item deleted',
      portfolio: creator.portfolio
    });
  } catch (error) {
    console.error('Delete portfolio item error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete portfolio item' });
  }
};
 
// ==================== GET PORTFOLIO (standalone) ====================
// Optional: returns just the portfolio array without the full profile
exports.getPortfolio = async (req, res) => {
  try {
    const creator = await Creator.findById(req.user._id).select('portfolio');
 
    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }
 
    res.json({
      success: true,
      portfolio: creator.portfolio || []
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get portfolio' });
  }
};
exports.updateNotificationSettings = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { notifications: req.body.notifications } },
      { new: true }
    ).select('notifications');

    res.json({ success: true, message: 'Notification settings updated', notifications: creator.notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { privacy: req.body.privacy } },
      { new: true }
    ).select('privacy');

    res.json({ success: true, message: 'Privacy settings updated', privacy: creator.privacy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateRateCard = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { rateCard: req.body.rateCard } },
      { new: true }
    ).select('rateCard');

    res.json({ success: true, message: 'Rate card updated', rateCard: creator.rateCard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.user._id,
      { $set: { availability: req.body.availability } },
      { new: true }
    ).select('availability');

    res.json({ success: true, message: 'Availability updated', availability: creator.availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};