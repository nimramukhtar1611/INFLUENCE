// controllers/campaignController.js - FIXED VERSION
const Campaign = require('../models/Campaign');
const Brand = require('../models/Brand');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const Creator = require('../models/Creator');
// ==================== CREATE CAMPAIGN ====================
exports.createCampaign = async (req, res) => {
  try {
    console.log('Creating campaign for brand:', req.user._id);
    
    const campaignData = {
      ...req.body,
      brandId: req.user._id,
      createdBy: req.user._id,
      status: 'draft'
    };

    const campaign = new Campaign(campaignData);
    await campaign.save();

    // Update brand stats
    await Brand.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalCampaigns': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create campaign' 
    });
  }
};

// ==================== GET BRAND CAMPAIGNS ====================
exports.getBrandCampaigns = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { brandId: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const [campaigns, total, counts] = await Promise.all([
      Campaign.find(query)
        .sort('-createdAt')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('title status budget spent startDate endDate deliverables progress')
        .lean(),
      Campaign.countDocuments(query),
      Campaign.aggregate([
        { $match: { brandId: req.user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      campaigns,
      counts: counts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to load campaigns' 
    });
  }
};

// ==================== GET AVAILABLE CAMPAIGNS FOR CREATORS ====================
exports.getAvailableCampaigns = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      category,
      minBudget,
      maxBudget,
      platform,
      niche
    } = req.query;

    const query = { 
      status: 'active'
    };

    // Add filters
    if (category && category !== '') {
      query.category = category;
    }
    
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget && minBudget !== '') {
        query.budget.$gte = parseInt(minBudget);
      }
      if (maxBudget && maxBudget !== '') {
        query.budget.$lte = parseInt(maxBudget);
      }
    }

    if (platform && platform !== '') {
      query['targetAudience.platforms'] = platform;
    }

    if (niche && niche !== '') {
      query['targetAudience.niches'] = niche;
    }

    // Exclude campaigns where creator already applied or was invited
    query.$or = [
      { 'applications.creatorId': { $ne: req.user._id } },
      { applications: { $size: 0 } },
      { 'invitedCreators.creatorId': { $ne: req.user._id } },
      { invitedCreators: { $size: 0 } }
    ];

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('brandId', 'brandName logo industry')
        .sort('-createdAt')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('title description budget deliverables requirements targetAudience category brandId createdAt endDate applications invitedCreators')
        .lean(),
      Campaign.countDocuments(query)
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get available campaigns error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get available campaigns' 
    });
  }
};

// ==================== APPLY TO CAMPAIGN ====================
exports.applyToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposal, rate, portfolio } = req.body;

    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is not accepting applications'
      });
    }

    // Check if already applied
    const alreadyApplied = campaign.applications.some(
      app => app.creatorId.toString() === req.user._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already applied to this campaign' 
      });
    }

    // Check if already invited
    const isInvited = campaign.invitedCreators.some(
      inv => inv.creatorId.toString() === req.user._id.toString()
    );

    // Add application
    campaign.applications.push({
      creatorId: req.user._id,
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
        creatorId: req.user._id,
        url: `/brand/campaigns/${campaign._id}`
      }
    });

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply to campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to apply to campaign' 
    });
  }
};

// ==================== REVIEW APPLICATION ====================
exports.reviewApplication = async (req, res) => {
  try {
    const { campaignId, applicationId } = req.params;
    const { status, feedback } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be accepted or rejected'
      });
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      brandId: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    // Find and update application
    const application = campaign.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Application already ${application.status}`
      });
    }

    application.status = status;
    application.reviewedAt = new Date();
    if (feedback) {
      application.feedback = feedback;
    }

    // If accepted, create a deal
    if (status === 'accepted') {
      // Check if deal already exists
      const existingDeal = await Deal.findOne({
        campaignId,
        creatorId: application.creatorId,
        status: { $nin: ['cancelled', 'declined'] }
      });

      if (!existingDeal) {
        // Create deal
        const deal = new Deal({
          campaignId,
          brandId: req.user._id,
          creatorId: application.creatorId,
          type: 'application',
          status: 'pending',
          budget: application.rate || campaign.budget,
          deliverables: campaign.deliverables,
          deadline: campaign.endDate,
          createdBy: req.user._id
        });
        await deal.save();

        campaign.selectedCreators.push({
          creatorId: application.creatorId,
          selectedAt: new Date(),
          dealId: deal._id
        });
      } else {
        campaign.selectedCreators.push({
          creatorId: application.creatorId,
          selectedAt: new Date(),
          dealId: existingDeal._id
        });
      }
    }

    await campaign.save();

    // Notify creator
    await Notification.create({
      userId: application.creatorId,
      type: 'campaign',
      title: status === 'accepted' ? 'Application Accepted' : 'Application Rejected',
      message: status === 'accepted' 
        ? `Your application for "${campaign.title}" has been accepted!`
        : `Your application for "${campaign.title}" has been reviewed.`,
      data: { 
        campaignId: campaign._id,
        url: `/creator/campaigns/${campaign._id}`
      }
    });

    res.json({
      success: true,
      message: `Application ${status}`,
      campaign
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to review application' 
    });
  }
};

// ==================== GET CREATOR CAMPAIGNS ====================
exports.getCreatorCampaigns = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;

    const query = { 
      'applications.creatorId': req.user._id 
    };

    if (status !== 'all') {
      query['applications.status'] = status;
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('brandId', 'brandName logo')
        .sort('-createdAt')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query)
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get creator campaigns error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get campaigns' 
    });
  }
};

// ==================== GET SINGLE CAMPAIGN ====================
exports.getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('brandId', 'brandName logo website description')
      .populate('selectedCreators.creatorId', 'displayName handle profilePicture')
      .populate('applications.creatorId', 'displayName handle profilePicture');

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    // Check authorization
    if (campaign.brandId._id.toString() !== req.user._id.toString() && 
        req.user.userType !== 'admin' &&
        !campaign.applications.some(app => app.creatorId?._id?.toString() === req.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view this campaign' 
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get campaign' 
    });
  }
};

// ==================== UPDATE CAMPAIGN ====================
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found or not authorized' 
      });
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update campaign' 
    });
  }
};

// ==================== DELETE CAMPAIGN ====================
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndDelete({
      _id: id,
      brandId: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found or not authorized' 
      });
    }

    // Delete associated deals
    await Deal.deleteMany({ campaignId: campaign._id });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete campaign' 
    });
  }
};

// ==================== PUBLISH CAMPAIGN ====================
exports.publishCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      {
        $set: {
          status: 'active',
          publishedAt: new Date()
        }
      },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    res.json({
      success: true,
      message: 'Campaign published successfully',
      campaign
    });
  } catch (error) {
    console.error('Publish campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to publish campaign' 
    });
  }
};

// ==================== PAUSE CAMPAIGN ====================
exports.pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      { $set: { status: 'paused' } },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      campaign
    });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to pause campaign' 
    });
  }
};

// ==================== COMPLETE CAMPAIGN ====================
exports.completeCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    res.json({
      success: true,
      message: 'Campaign completed successfully',
      campaign
    });
  } catch (error) {
    console.error('Complete campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to complete campaign' 
    });
  }
};

// ==================== ARCHIVE CAMPAIGN ====================
exports.archiveCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId: req.user._id },
      { $set: { status: 'archived' } },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    res.json({
      success: true,
      message: 'Campaign archived successfully',
      campaign
    });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to archive campaign' 
    });
  }
};

// ==================== DUPLICATE CAMPAIGN ====================
exports.duplicateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const original = await Campaign.findOne({
      _id: id,
      brandId: req.user._id
    });

    if (!original) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    const campaignData = original.toObject();
    delete campaignData._id;
    delete campaignData.createdAt;
    delete campaignData.updatedAt;
    
    campaignData.title = `${campaignData.title} (Copy)`;
    campaignData.status = 'draft';
    campaignData.publishedAt = null;
    campaignData.completedAt = null;
    campaignData.invitedCreators = [];
    campaignData.applications = [];
    campaignData.selectedCreators = [];

    const campaign = new Campaign(campaignData);
    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign duplicated successfully',
      campaign
    });
  } catch (error) {
    console.error('Duplicate campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to duplicate campaign' 
    });
  }
};

// ==================== INVITE CREATOR ====================
exports.inviteCreator = async (req, res) => {
  try {
    const { id } = req.params;
    const { creatorId, message } = req.body;

    const campaign = await Campaign.findOne({
      _id: id,
      brandId: req.user._id,
      status: 'active'
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found or not active' 
      });
    }

    // Check if already invited
    const alreadyInvited = campaign.invitedCreators.some(
      inv => inv.creatorId.toString() === creatorId
    );

    if (alreadyInvited) {
      return res.status(400).json({
        success: false,
        error: 'Creator already invited'
      });
    }

    campaign.invitedCreators.push({
      creatorId,
      message,
      invitedAt: new Date(),
      status: 'pending'
    });

    await campaign.save();

    // Create notification for creator
    await Notification.create({
      userId: creatorId,
      type: 'campaign',
      title: 'Campaign Invitation',
      message: `You've been invited to join "${campaign.title}"`,
      data: { 
        campaignId: campaign._id,
        url: `/creator/campaigns/${campaign._id}`
      }
    });

    res.json({
      success: true,
      message: 'Creator invited successfully'
    });
  } catch (error) {
    console.error('Invite creator error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to invite creator' 
    });
  }
};

// ==================== GET CAMPAIGN ANALYTICS ====================
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      _id: id,
      brandId: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    // Get deal performance
    const deals = await Deal.find({ campaignId: campaign._id })
      .populate('creatorId', 'displayName handle')
      .select('budget deliverables status rating');

    // Calculate metrics
    const metrics = {
      totalDeals: deals.length,
      completedDeals: deals.filter(d => d.status === 'completed').length,
      pendingDeals: deals.filter(d => d.status === 'pending').length,
      inProgressDeals: deals.filter(d => ['accepted', 'in-progress'].includes(d.status)).length,
      totalBudget: campaign.budget,
      spent: campaign.spent,
      remaining: campaign.budget - campaign.spent,
      averageDealValue: deals.length ? campaign.spent / deals.length : 0,
      deliverables: campaign.deliverables.reduce((acc, d) => acc + (d.quantity || 1), 0),
      completedDeliverables: campaign.deliverables.filter(d => d.status === 'completed')
        .reduce((acc, d) => acc + (d.quantity || 1), 0),
      creatorPerformance: deals.map(d => ({
        creator: d.creatorId,
        budget: d.budget,
        status: d.status,
        rating: d.rating
      }))
    };

    res.json({
      success: true,
      metrics,
      deals
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to load campaign analytics' 
    });
  }
};