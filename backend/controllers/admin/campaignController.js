// controllers/admin/campaignController.js - COMPLETE
const Campaign = require('../../models/Campaign');
const Brand = require('../../models/Brand');
const Deal = require('../../models/Deal');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const AuditLog = require('../../models/AuditLog');
const asyncHandler = require('express-async-handler');
const { sendEmail } = require('../../services/emailService');

// @desc    Get all campaigns
// @route   GET /api/admin/campaigns
// @access  Private/Admin
const getCampaigns = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    category,
    fromDate,
    toDate,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (category) query.category = category;
  
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [campaigns, total] = await Promise.all([
    Campaign.find(query)
      .populate('brandId', 'brandName logo email')
      .populate('selectedCreators.creatorId', 'displayName handle profilePicture')
      .populate('applications.creatorId', 'displayName handle')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Campaign.countDocuments(query)
  ]);

  // Get additional stats
  const campaignsWithStats = await Promise.all(campaigns.map(async (campaign) => {
    const deals = await Deal.find({ campaignId: campaign._id }).lean();
    
    return {
      ...campaign,
      stats: {
        totalDeals: deals.length,
        completedDeals: deals.filter(d => d.status === 'completed').length,
        totalSpent: deals.reduce((sum, d) => sum + (d.budget || 0), 0),
        averageDealValue: deals.length > 0 
          ? deals.reduce((sum, d) => sum + (d.budget || 0), 0) / deals.length 
          : 0
      }
    };
  }));

  res.json({
    success: true,
    data: campaignsWithStats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single campaign
// @route   GET /api/admin/campaigns/:id
// @access  Private/Admin
const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('brandId', 'brandName logo email phone website')
    .populate('selectedCreators.creatorId', 'displayName handle profilePicture email')
    .populate('applications.creatorId', 'displayName handle profilePicture')
    .lean();

  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  // Get deals for this campaign
  const deals = await Deal.find({ campaignId: campaign._id })
    .populate('creatorId', 'displayName handle')
    .populate('brandId', 'brandName')
    .lean();

  // Get brand info
  const brand = await Brand.findById(campaign.brandId._id).lean();

  res.json({
    success: true,
    data: {
      ...campaign,
      brand,
      deals,
      stats: {
        totalDeals: deals.length,
        completedDeals: deals.filter(d => d.status === 'completed').length,
        totalBudget: campaign.budget,
        totalSpent: deals.reduce((sum, d) => sum + (d.budget || 0), 0)
      }
    }
  });
});

// @desc    Update campaign status
// @route   PUT /api/admin/campaigns/:id/status
// @access  Private/Admin
const updateCampaignStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  const oldStatus = campaign.status;
  campaign.status = status;
  
  if (status === 'approved' || status === 'active') {
    campaign.approvedAt = new Date();
    campaign.approvedBy = req.user._id;
  } else if (status === 'rejected') {
    campaign.rejectedAt = new Date();
    campaign.rejectedBy = req.user._id;
    campaign.rejectionReason = reason;
  }

  await campaign.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'campaign_status_updated',
    targetResource: {
      type: 'campaign',
      id: campaign._id
    },
    changes: { status: { from: oldStatus, to: status } },
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Notify brand
  await Notification.create({
    userId: campaign.brandId,
    type: 'campaign',
    title: `Campaign ${status}`,
    message: `Your campaign "${campaign.title}" has been ${status}`,
    data: { campaignId: campaign._id, url: `/brand/campaigns/${campaign._id}` }
  });

  // Send email
  const brand = await User.findById(campaign.brandId);
  if (brand) {
    await sendEmail({
      email: brand.email,
      subject: `Campaign ${status} - InfluenceX`,
      html: `
        <h2>Campaign ${status}</h2>
        <p>Hi ${brand.fullName},</p>
        <p>Your campaign "${campaign.title}" has been ${status}.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL}/brand/campaigns/${campaign._id}">View Campaign</a></p>
      `
    });
  }

  res.json({
    success: true,
    message: `Campaign ${status} successfully`,
    data: campaign
  });
});

// @desc    Feature campaign
// @route   POST /api/admin/campaigns/:id/feature
// @access  Private/Admin
const featureCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  campaign.isFeatured = true;
  campaign.featuredAt = new Date();
  campaign.featuredBy = req.user._id;
  await campaign.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'campaign_featured',
    targetResource: {
      type: 'campaign',
      id: campaign._id
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: 'Campaign featured successfully'
  });
});

// @desc    Unfeature campaign
// @route   DELETE /api/admin/campaigns/:id/feature
// @access  Private/Admin
const unfeatureCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  campaign.isFeatured = false;
  campaign.featuredAt = undefined;
  campaign.featuredBy = undefined;
  await campaign.save();

  res.json({
    success: true,
    message: 'Campaign unfeatured successfully'
  });
});

// @desc    Get campaign stats
// @route   GET /api/admin/campaigns/stats
// @access  Private/Admin
const getCampaignStats = asyncHandler(async (req, res) => {
  const [total, byStatus, byCategory, averageBudget] = await Promise.all([
    Campaign.countDocuments(),
    Campaign.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Campaign.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    Campaign.aggregate([
      {
        $group: {
          _id: null,
          avg: { $avg: '$budget' },
          min: { $min: '$budget' },
          max: { $max: '$budget' }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      total,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byCategory,
      averageBudget: averageBudget[0]?.avg || 0,
      minBudget: averageBudget[0]?.min || 0,
      maxBudget: averageBudget[0]?.max || 0
    }
  });
});

// @desc    Get pending campaigns
// @route   GET /api/admin/campaigns/pending
// @access  Private/Admin
const getPendingCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({ status: 'pending' })
    .populate('brandId', 'brandName email')
    .sort({ createdAt: 1 });

  res.json({
    success: true,
    data: campaigns
  });
});

// @desc    Bulk update campaigns
// @route   PUT /api/admin/campaigns/bulk
// @access  Private/Admin
const bulkUpdateCampaigns = asyncHandler(async (req, res) => {
  const { campaignIds, updates } = req.body;

  if (!campaignIds || !campaignIds.length) {
    res.status(400);
    throw new Error('No campaigns selected');
  }

  const result = await Campaign.updateMany(
    { _id: { $in: campaignIds } },
    { $set: updates }
  );

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'campaigns_bulk_updated',
    metadata: {
      count: campaignIds.length,
      updates
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: `${result.modifiedCount} campaigns updated successfully`
  });
});

// @desc    Delete campaign
// @route   DELETE /api/admin/campaigns/:id
// @access  Private/Admin
const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'campaign_deleted',
    targetResource: {
      type: 'campaign',
      id: campaign._id
    },
    metadata: {
      title: campaign.title,
      brandId: campaign.brandId
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Delete associated deals
  await Deal.deleteMany({ campaignId: campaign._id });

  // Delete campaign
  await campaign.deleteOne();

  res.json({
    success: true,
    message: 'Campaign deleted successfully'
  });
});

module.exports = {
  getCampaigns,
  getCampaign,
  updateCampaignStatus,
  featureCampaign,
  unfeatureCampaign,
  getCampaignStats,
  getPendingCampaigns,
  bulkUpdateCampaigns,
  deleteCampaign
};