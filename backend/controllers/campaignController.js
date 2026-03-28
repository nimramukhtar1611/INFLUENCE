// controllers/campaignController.js - FIXED VERSION
const Campaign = require('../models/Campaign');
const Brand = require('../models/Brand');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Creator = require('../models/Creator');
const Subscription = require('../models/Subscription');
const PaymentCalculator = require('../services/paymentCalculator');
const { getBrandFinancials } = require('./paymentController');

const getBrandContextId = (req) => req.brandId || req.user?._id;

const getSubscriptionPlanForUser = async (userId) => {
  if (!userId) return 'free';

  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ['active', 'trialing'] }
  })
    .select('planId')
    .lean();

  return String(subscription?.planId || 'free').toLowerCase();
};

const getCreatorCompletedDealsLimitByPlan = (planId = 'free') => {
  const normalizedPlan = String(planId || 'free').toLowerCase();
  if (normalizedPlan === 'starter') return 10;
  if (normalizedPlan === 'professional') return 30;
  if (normalizedPlan === 'enterprise') return Number.POSITIVE_INFINITY;
  return 2;
};

const buildInsufficientFundsPayload = ({ availableBalance, requiredAmount }) => ({
  success: false,
  code: 'BRAND_INSUFFICIENT_FUNDS',
  error: `Insufficient balance to accept this application. Available: $${availableBalance.toFixed(2)}, Required: $${requiredAmount.toFixed(2)}.`,
  availableBalance,
  requiredAmount,
  shortfall: Math.max(requiredAmount - availableBalance, 0),
  requiresBrandFunding: true
});

const ensureEscrowForDeal = async ({ deal, acceptedByUserId }) => {
  const existingEscrow = await Payment.findOne({
    dealId: deal._id,
    type: 'escrow',
    status: { $in: ['pending', 'processing', 'in-escrow', 'completed'] }
  }).sort('-createdAt');

  if (existingEscrow) {
    deal.paymentId = existingEscrow._id;
    deal.paymentStatus = existingEscrow.status === 'completed' ? 'released' : 'in-escrow';
    return existingEscrow;
  }

  const fees = await PaymentCalculator.calculateFees(deal.budget, 'brand');
  const payment = new Payment({
    transactionId: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'escrow',
    status: 'in-escrow',
    amount: deal.budget,
    fee: fees.total,
    netAmount: deal.budget - fees.total,
    from: { userId: deal.brandId, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    description: `Escrow payment for deal ${deal._id}`,
    metadata: { fees, source: 'campaign_application_acceptance', acceptedBy: acceptedByUserId }
  });

  await payment.save();

  deal.paymentId = payment._id;
  deal.paymentStatus = 'in-escrow';
  return payment;
};

// ==================== CREATE CAMPAIGN ====================
exports.createCampaign = async (req, res) => {
  try {
    const brandId = getBrandContextId(req);
    console.log('Creating campaign for brand:', brandId);
    
    const campaignData = {
      ...req.body,
      brandId,
      createdBy: req.user._id,
      status: 'draft'
    };

    const campaign = new Campaign(campaignData);
    await campaign.save();

    // Update brand stats
    await Brand.findByIdAndUpdate(brandId, {
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
    const brandId = getBrandContextId(req);
    
    const query = { brandId };
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
        { $match: { brandId } },
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

    const plan = await getSubscriptionPlanForUser(req.user._id);
    const completedDeals = await Deal.countDocuments({ creatorId: req.user._id, status: 'completed' });
    const completedDealsLimit = getCreatorCompletedDealsLimitByPlan(plan);

    if (completedDeals >= completedDealsLimit) {
      const maxText = Number.isFinite(completedDealsLimit) ? completedDealsLimit : 'Infinite';
      return res.status(403).json({
        success: false,
        error: `Completed deal limit reached for your ${plan} plan (${completedDeals}/${maxText}). Upgrade to apply for more deals.`,
        code: 'CREATOR_DEAL_LIMIT_REACHED',
        plan,
        completedDeals,
        completedDealsLimit: Number.isFinite(completedDealsLimit) ? completedDealsLimit : -1
      });
    }

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
    const brandId = getBrandContextId(req);

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be accepted or rejected'
      });
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      brandId
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
      const acceptanceBudget = Number(application.rate || campaign.budget || 0);
      const financials = await getBrandFinancials(brandId);

      if (acceptanceBudget > Number(financials?.available || 0)) {
        return res.status(400).json(
          buildInsufficientFundsPayload({
            availableBalance: Number(financials?.available || 0),
            requiredAmount: acceptanceBudget
          })
        );
      }

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
          brandId,
          creatorId: application.creatorId,
          type: 'application',
          status: 'accepted',
          paymentStatus: 'pending',
          budget: application.rate || campaign.budget,
          deliverables: campaign.deliverables,
          deadline: campaign.endDate,
          createdBy: req.user._id
        });

        await ensureEscrowForDeal({ deal, acceptedByUserId: req.user._id });
        await deal.save();

        campaign.selectedCreators.push({
          creatorId: application.creatorId,
          selectedAt: new Date(),
          dealId: deal._id
        });
      } else {
        existingDeal.status = 'accepted';
        existingDeal.budget = application.rate || existingDeal.budget || campaign.budget;
        if (!existingDeal.deadline && campaign.endDate) {
          existingDeal.deadline = campaign.endDate;
        }
        await ensureEscrowForDeal({ deal: existingDeal, acceptedByUserId: req.user._id });
        await existingDeal.save();

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
    const brandId = getBrandContextId(req);

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
    if (campaign.brandId._id.toString() !== brandId.toString() && 
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId },
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndDelete({
      _id: id,
      brandId
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId },
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId },
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId },
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brandId },
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
    const brandId = getBrandContextId(req);

    const original = await Campaign.findOne({
      _id: id,
      brandId
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOne({
      _id: id,
      brandId,
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
    const brandId = getBrandContextId(req);

    const campaign = await Campaign.findOne({
      _id: id,
      brandId
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