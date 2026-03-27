// controllers/dealController.js - COMPLETE PRODUCTION-READY VERSION
const Deal = require('../models/Deal');
const Campaign = require('../models/Campaign');
const Creator = require('../models/Creator');
const Payment = require('../models/Payment');
const { Conversation } = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const { isValidObjectId, isValidBudget, isValidFutureDate } = require('../utils/validators');
const { getBrandFinancials } = require('./paymentController');
const PaymentCalculator = require('../services/paymentCalculator');
const mongoose = require('mongoose');

const buildConversationId = (dealId) => `deal_${dealId}_${Date.now()}`;

const buildMessageId = (conversationId) => `msg_${conversationId}_${Date.now()}`;
const getBrandContextId = (req) => req.brandId || req.user?._id;

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user can perform action on deal
 */
const canUserAct = (deal, userId, requiredRole = null, brandContextId = null) => {
  const effectiveBrandId = (brandContextId || userId).toString();
  const isBrand = deal.brandId.toString() === effectiveBrandId;
  const isCreator = deal.creatorId.toString() === userId.toString();
  if (requiredRole === 'brand') return isBrand;
  if (requiredRole === 'creator') return isCreator;
  return isBrand || isCreator;
};

const getActorRoleOnDeal = (deal, req) => {
  const brandContextId = getBrandContextId(req);
  if (canUserAct(deal, req.user._id, 'brand', brandContextId)) {
    return 'brand';
  }
  if (canUserAct(deal, req.user._id, 'creator')) {
    return 'creator';
  }
  return null;
};

/**
 * Validate status transition
 */
const isValidTransition = (currentStatus, newStatus) => {
  const transitions = {
    pending: ['accepted', 'declined', 'cancelled', 'negotiating'],
    negotiating: ['pending', 'accepted', 'declined', 'cancelled'],
    accepted: ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'revision', 'cancelled', 'disputed'],
    revision: ['in-progress', 'cancelled', 'disputed'],
    completed: [],
    cancelled: [],
    disputed: ['resolved', 'cancelled'],
    overdue: ['in-progress', 'completed', 'cancelled'],
  };
  return transitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Add timeline event to deal
 */
const addTimelineEvent = (deal, event, description, userId, metadata = {}) => {
  deal.timeline.push({
    event,
    description,
    userId,
    metadata,
    createdAt: new Date(),
  });
};

const ensureReleasedPaymentRecord = async (deal, releasedByUserId) => {
  const existingPayment = await Payment.findOne({ dealId: deal._id }).sort('-createdAt');
  const releasedAt = new Date();

  if (existingPayment) {
    const wasUnreleased = !['completed', 'available'].includes(existingPayment.status);

    if (wasUnreleased) {
      existingPayment.status = 'completed';
      existingPayment.paidAt = releasedAt;
      existingPayment.description = `Payment released for completed deal ${deal._id}`;
    }

    existingPayment.description = existingPayment.description || `Payment released for completed deal ${deal._id}`;
    existingPayment.metadata = {
      ...(existingPayment.metadata || {}),
      releaseSource: 'deal_completion',
      releasedAt,
      releasedBy: releasedByUserId
    };

    await existingPayment.save();
    return existingPayment;
  }

  const grossAmount = Number(deal.budget || 0);
  const netAmount = Number(deal.netAmount || deal.budget || 0);
  const fee = Math.max(grossAmount - netAmount, 0);

  const createdPayment = await Payment.create({
    transactionId: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'payment',
    status: 'completed',
    amount: grossAmount,
    fee,
    netAmount,
    from: { userId: deal.brandId, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    description: `Payment released for completed deal ${deal._id}`,
    paidAt: releasedAt,
    metadata: {
      releaseSource: 'deal_completion',
      releasedAt,
      releasedBy: releasedByUserId,
      createdFromDeal: true
    }
  });

  return createdPayment;
};

// ==================== CREATE DEAL ====================
exports.createDeal = catchAsync(async (req, res) => {
  const brandId = getBrandContextId(req);
  const {
    campaignId,
    creatorId,
    budget,
    deadline,
    deliverables,
    terms,
    paymentTerms = 'escrow',
    paymentType = 'fixed',
  } = req.body;

  // Validate required fields
  if (!campaignId || !creatorId || !budget || !deadline || !deliverables?.length) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: campaignId, creatorId, budget, deadline, deliverables',
    });
  }

  // Validate IDs
  if (!isValidObjectId(campaignId) || !isValidObjectId(creatorId)) {
    return res.status(400).json({ success: false, error: 'Invalid campaign or creator ID' });
  }

  // Validate budget
  if (!isValidBudget(budget)) {
    return res.status(400).json({ success: false, error: 'Budget must be between $10 and $1,000,000' });
  }

  // Validate deadline
  if (!isValidFutureDate(deadline)) {
    return res.status(400).json({ success: false, error: 'Deadline must be in the future' });
  }

  // Check campaign exists and belongs to brand
  const campaign = await Campaign.findOne({ _id: campaignId, brandId });
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found or not owned by you' });
  }

  // Check creator exists
  const creator = await Creator.findById(creatorId);
  if (!creator) {
    return res.status(404).json({ success: false, error: 'Creator not found' });
  }

  // Check if deal already exists (pending, accepted, in-progress)
  const existingDeal = await Deal.findOne({
    campaignId,
    creatorId,
    brandId,
    status: { $in: ['pending', 'accepted', 'in-progress'] },
  });
  if (existingDeal) {
    return res.status(400).json({ success: false, error: 'A deal already exists with this creator' });
  }

  // Create deal
  const deal = new Deal({
    campaignId,
    brandId,
    creatorId,
    budget,
    deadline,
    deliverables,
    terms,
    paymentTerms,
    paymentType,
    status: 'pending',
    createdBy: req.user._id,
  });
  addTimelineEvent(deal, 'Deal Created', `Deal offer sent to ${creator.displayName}`, req.user._id);

  await deal.save();

  // Create conversation for deal (non-blocking - deal still succeeds if this fails)
  try {
    const conversation = new Conversation({
      conversation_id: buildConversationId(deal._id),
      type: 'deal',
      deal_id: deal._id,
      participants: [
        { user_id: deal.brandId, user_type: 'brand' },
        { user_id: deal.creatorId, user_type: 'creator' },
      ],
      participant_count: 2,
      created_by: { user_id: deal.brandId, user_type: 'brand' },
    });
    await conversation.save();

    // Add initial deal message in conversation
    await Message.create({
      message_id: buildMessageId(conversation.conversation_id),
      conversation_id: conversation._id,
      sender: {
        user_id: deal.brandId,
        user_type: 'brand',
      },
      message_type: 'deal_update',
      content: `A new deal has been created. Budget: $${budget}, Deadline: ${new Date(deadline).toLocaleDateString()}`,
      metadata: {
        deal_update_data: {
          dealId: deal._id,
          event: 'deal_created',
        },
      },
    });

    deal.conversationId = conversation._id;
    await deal.save();
  } catch (convError) {
    console.error('Failed to create conversation for deal:', convError.message);
    // Deal is still valid, conversation can be created later
  }

  // Update campaign invited creators
  await Campaign.findByIdAndUpdate(campaignId, {
    $push: {
      invitedCreators: {
        creatorId,
        status: 'pending',
        invitedAt: new Date(),
      },
    },
  });

  // Notify creator
  await Notification.create({
    userId: creatorId,
    type: 'deal',
    title: 'New Deal Offer',
    message: `You've received a new deal offer for "${campaign.title}" worth $${budget}`,
    data: { dealId: deal._id, url: `/creator/deals/${deal._id}` },
  });

  res.status(201).json({ success: true, message: 'Deal offer sent', deal });
});

// ==================== GET BRAND DEALS ====================
exports.getBrandDeals = catchAsync(async (req, res) => {
  const { status = 'all', page = 1, limit = 10 } = req.query;
  const brandId = getBrandContextId(req);

  const query = { brandId };
  if (status !== 'all') query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [deals, total, counts] = await Promise.all([
    Deal.find(query)
      .populate('creatorId', 'displayName handle profilePicture')
      .populate('campaignId', 'title')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Deal.countDocuments(query),
    Deal.aggregate([
      { $match: { brandId } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } },
    ]),
  ]);

  const countsMap = counts.reduce((acc, c) => {
    acc[c._id] = { count: c.count, value: c.value };
    return acc;
  }, {});

  res.json({
    success: true,
    deals,
    counts: countsMap,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== GET CREATOR DEALS ====================
exports.getCreatorDeals = catchAsync(async (req, res) => {
  const { status = 'all', page = 1, limit = 10 } = req.query;

  const query = { creatorId: req.user._id };
  if (status !== 'all') query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [deals, total, counts] = await Promise.all([
    Deal.find(query)
      .populate('brandId', 'brandName logo')
      .populate('campaignId', 'title')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Deal.countDocuments(query),
    Deal.aggregate([
      { $match: { creatorId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } },
    ]),
  ]);

  const countsMap = counts.reduce((acc, c) => {
    acc[c._id] = { count: c.count, value: c.value };
    return acc;
  }, {});

  res.json({
    success: true,
    deals,
    counts: countsMap,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== GET SINGLE DEAL ====================
exports.getDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const brandContextId = getBrandContextId(req);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid deal ID' });
  }

  const deal = await Deal.findById(id)
    .populate('brandId', 'brandName logo profilePicture email phone')
    .populate('creatorId', 'displayName handle profilePicture email phone')
    .populate('campaignId', 'title description requirements brandAssets')
    .populate('negotiation.proposedBy', 'fullName')
    .populate('performancePaymentId')
    .lean();

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  // Check authorization - extract _id from populated fields
  const dealBrandId = deal.brandId?._id || deal.brandId;
  const dealCreatorId = deal.creatorId?._id || deal.creatorId;
  const userId = req.user._id.toString();
  const effectiveBrandUserId = req.user.userType === 'brand' ? brandContextId.toString() : userId;
  if (dealBrandId.toString() !== effectiveBrandUserId && dealCreatorId.toString() !== userId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  // Backfill missing conversation for legacy deals so socket chat can join reliably.
  if (!deal.conversationId) {
    try {
      const conversation = new Conversation({
        conversation_id: buildConversationId(deal._id),
        type: 'deal',
        deal_id: deal._id,
        participants: [
          { user_id: dealBrandId, user_type: 'brand' },
          { user_id: dealCreatorId, user_type: 'creator' },
        ],
        participant_count: 2,
        created_by: { user_id: dealBrandId, user_type: 'brand' },
      });

      await conversation.save();
      await Deal.findByIdAndUpdate(deal._id, { conversationId: conversation._id });
      deal.conversationId = conversation._id;
    } catch (convError) {
      console.error('Failed to ensure deal conversation:', convError.message);
    }
  }

  // Populate messages if needed (optional, could be separate endpoint)
  const messages = await Message.find({ dealId: deal._id })
    .populate('senderId', 'fullName displayName profilePicture')
    .sort('-createdAt')
    .limit(50)
    .lean();

  deal.messages = messages;

  res.json({ success: true, deal });
});

// ==================== UPDATE DEAL STATUS ====================
exports.updateDealStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const brandContextId = getBrandContextId(req);

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid deal ID' });
  }

  const deal = await Deal.findById(id);
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  // Check authorization
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  // Validate transition
  if (!isValidTransition(deal.status, status)) {
    return res.status(400).json({
      success: false,
      error: `Cannot transition from ${deal.status} to ${status}`,
    });
  }

  const actorRole = getActorRoleOnDeal(deal, req);

  // Business rule: only creator can accept an initial pending offer.
  if (deal.status === 'pending' && status === 'accepted' && actorRole !== 'creator') {
    return res.status(403).json({
      success: false,
      error: 'Only the creator can accept an initial offer'
    });
  }

  // Business rule: during negotiation, only the recipient of the latest counter can accept.
  if (deal.status === 'negotiating' && status === 'accepted') {
    const pendingOffers = Array.isArray(deal.negotiation)
      ? deal.negotiation.filter((n) => n.status === 'pending')
      : [];
    const latestPendingOffer = pendingOffers.length ? pendingOffers[pendingOffers.length - 1] : null;

    if (!latestPendingOffer) {
      return res.status(400).json({
        success: false,
        error: 'No pending counter offer found to accept'
      });
    }

    if (latestPendingOffer.proposedBy?.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You cannot accept your own counter offer'
      });
    }
  }

  // When accepting from negotiating state, apply the latest pending counter terms.
  if (deal.status === 'negotiating' && status === 'accepted' && Array.isArray(deal.negotiation)) {
    const pendingOffers = deal.negotiation.filter(n => n.status === 'pending');
    const latestPendingOffer = pendingOffers.length ? pendingOffers[pendingOffers.length - 1] : null;

    if (latestPendingOffer) {
      if (Number.isFinite(latestPendingOffer.budget)) {
        deal.budget = latestPendingOffer.budget;
      }
      if (latestPendingOffer.deadline) {
        deal.deadline = latestPendingOffer.deadline;
      }

      latestPendingOffer.status = 'accepted';
      deal.negotiation.forEach((offer) => {
        if (offer._id.toString() !== latestPendingOffer._id.toString() && offer.status === 'pending') {
          offer.status = 'declined';
        }
      });
    }
  }

  const oldStatus = deal.status;
  deal.status = status;
  addTimelineEvent(deal, `Status Changed to ${status}`, reason || `Status updated to ${status}`, req.user._id, { oldStatus, reason });

  await deal.save();

  // Notify other party
  const notifyUserId = actorRole === 'brand' ? deal.creatorId : deal.brandId;
  await Notification.create({
    userId: notifyUserId,
    type: 'deal',
    title: `Deal ${status}`,
    message: `Deal status changed to ${status}${reason ? `: ${reason}` : ''}`,
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: `Deal status updated to ${status}`, deal });
});

// ==================== ACCEPT DEAL ====================
exports.acceptDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deal = await Deal.findOne({ _id: id, creatorId: req.user._id, status: 'pending' });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot be accepted' });
  }

  // Check if brand has enough balance for escrow
  const financials = await getBrandFinancials(deal.brandId);
  if (deal.budget > financials.available) {
    return res.status(400).json({
      success: false,
      error: `Brand has insufficient balance to start this deal. Available: $${financials.available.toFixed(2)}, Required: $${deal.budget.toFixed(2)}.`
    });
  }

  // Create escrow payment
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
    metadata: { fees }
  });

  await payment.save();

  deal.status = 'accepted';
  deal.paymentStatus = 'in-escrow';
  deal.paymentId = payment._id;
  
  addTimelineEvent(deal, 'Deal Accepted', 'Creator accepted the deal', req.user._id);
  
  // Create first timeline event for escrow
  addTimelineEvent(deal, 'Payment Escrowed', `Funds ($${deal.budget}) secured in escrow`, req.user._id, { paymentId: payment._id });
  
  await deal.save();

  // Notify brand
  await Notification.create({
    userId: deal.brandId,
    type: 'deal',
    title: 'Deal Accepted',
    message: 'Creator has accepted your deal offer',
    data: { dealId: deal._id, url: `/brand/deals/${deal._id}` },
  });

  res.json({ success: true, message: 'Deal accepted' });
});

// ==================== REJECT DEAL ====================
exports.rejectDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const deal = await Deal.findOne({ _id: id, creatorId: req.user._id, status: 'pending' });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot be rejected' });
  }

  deal.status = 'declined';
  addTimelineEvent(deal, 'Deal Declined', reason || 'Creator declined the deal', req.user._id, { reason });
  await deal.save();

  // Notify brand
  await Notification.create({
    userId: deal.brandId,
    type: 'deal',
    title: 'Deal Declined',
    message: reason || 'Creator has declined your deal offer',
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: 'Deal declined' });
});

// ==================== MARK IN PROGRESS ====================
exports.markInProgress = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deal = await Deal.findOne({ _id: id, creatorId: req.user._id, status: 'accepted' });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot be started' });
  }

  deal.status = 'in-progress';
  addTimelineEvent(deal, 'Work Started', 'Creator started working on the deal', req.user._id);
  await deal.save();

  // Notify brand
  await Notification.create({
    userId: deal.brandId,
    type: 'deal',
    title: 'Work Started',
    message: 'Creator has started working on the deal',
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: 'Deal marked as in progress' });
});

// ==================== COMPLETE DEAL ====================
exports.completeDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const brandId = getBrandContextId(req);
  const deal = await Deal.findOne({ _id: id, brandId, status: 'in-progress' });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot be completed' });
  }

  // Check if all deliverables are approved
  const allApproved = deal.deliverables.every(d => d.status === 'approved');
  if (!allApproved) {
    return res.status(400).json({
      success: false,
      error: 'Cannot complete deal: Some deliverables are not approved',
    });
  }

  deal.status = 'completed';
  deal.completedAt = new Date();
  deal.paymentStatus = 'released';
  addTimelineEvent(deal, 'Deal Completed', 'All deliverables approved, deal completed', req.user._id);
  await deal.save();

  // Update campaign spent
  await Campaign.findByIdAndUpdate(deal.campaignId, {
    $inc: { spent: deal.budget },
  });

  // Update creator earnings
  await Creator.findByIdAndUpdate(deal.creatorId, {
    $inc: {
      'stats.totalEarnings': deal.netAmount || deal.budget,
      'stats.completedCampaigns': 1,
    },
  });

  await ensureReleasedPaymentRecord(deal, req.user._id);

  // Notify creator
  await Notification.create({
    userId: deal.creatorId,
    type: 'payment',
    title: 'Payment Released',
    message: `$${deal.budget} has been released for completed deal`,
    data: { dealId: deal._id, url: `/creator/earnings` },
  });

  res.json({ success: true, message: 'Deal completed successfully' });
});

// ==================== CANCEL DEAL ====================
exports.cancelDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const brandId = getBrandContextId(req);

  const deal = await Deal.findOne({
    _id: id,
    $or: [{ brandId }, { creatorId: req.user._id }],
    status: { $nin: ['completed', 'cancelled'] },
  });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot be cancelled' });
  }

  deal.status = 'cancelled';
  addTimelineEvent(deal, 'Deal Cancelled', reason || 'Deal cancelled', req.user._id, { reason });
  await deal.save();

  // Refund if payment in escrow
  if (deal.paymentStatus === 'in-escrow') {
    await Payment.findOneAndUpdate(
      { dealId: deal._id },
      { $set: { status: 'refunded', refundedAt: new Date(), refundReason: reason } }
    );
  }

  // Notify other party
  const actorRole = getActorRoleOnDeal(deal, req);
  const notifyUserId = actorRole === 'brand' ? deal.creatorId : deal.brandId;
  await Notification.create({
    userId: notifyUserId,
    type: 'deal',
    title: 'Deal Cancelled',
    message: reason || `Deal has been cancelled${reason ? `: ${reason}` : ''}`,
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: 'Deal cancelled' });
});

// ==================== REQUEST REVISION ====================
exports.requestRevision = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { deliverableId, notes } = req.body;
  const brandId = getBrandContextId(req);

  if (!deliverableId || !notes) {
    return res.status(400).json({ success: false, error: 'Deliverable ID and revision notes required' });
  }

  const deal = await Deal.findOne({ _id: id, brandId, status: 'in-progress' });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot request revision' });
  }

  const deliverable = deal.deliverables.id(deliverableId);
  if (!deliverable) {
    return res.status(404).json({ success: false, error: 'Deliverable not found' });
  }

  deliverable.status = 'revision';
  deliverable.revisionNotes = notes;
  deliverable.revisionRequestedAt = new Date();
  deliverable.revisionCount += 1;

  deal.status = 'revision';
  addTimelineEvent(deal, 'Revision Requested', notes, req.user._id, { deliverableId });
  await deal.save();

  // Notify creator
  await Notification.create({
    userId: deal.creatorId,
    type: 'deal',
    title: 'Revision Requested',
    message: `Revision requested for ${deliverable.type} deliverable: ${notes.substring(0, 100)}`,
    data: { dealId: deal._id, deliverableId, url: `/creator/deals/${deal._id}` },
  });

  res.json({ success: true, message: 'Revision requested' });
});

// ==================== COUNTER OFFER ====================
exports.counterOffer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { budget, deadline, message } = req.body;
  const brandContextId = getBrandContextId(req);

  const deal = await Deal.findOne({ _id: id, status: { $in: ['pending', 'negotiating'] } });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  // Only the recipient can counter
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const actorRole = getActorRoleOnDeal(deal, req);

  // Initial direct offers (pending) can only be countered by the creator.
  if (deal.status === 'pending' && actorRole !== 'creator') {
    return res.status(403).json({
      success: false,
      error: 'Only the creator can counter the initial offer'
    });
  }

  if (deal.status === 'negotiating' && Array.isArray(deal.negotiation)) {
    const pendingOffers = deal.negotiation.filter(n => n.status === 'pending');
    const latestPendingOffer = pendingOffers.length ? pendingOffers[pendingOffers.length - 1] : null;

    // A user cannot send two consecutive counters without the counterparty responding.
    if (latestPendingOffer && latestPendingOffer.proposedBy?.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Wait for the other party to accept or counter your latest offer'
      });
    }

    // Previous pending offer is now superseded by this response counter.
    if (latestPendingOffer && latestPendingOffer.status === 'pending') {
      latestPendingOffer.status = 'declined';
    }
  }

  deal.negotiation.push({
    proposedBy: req.user._id,
    budget,
    deadline,
    message,
    status: 'pending',
    createdAt: new Date(),
  });

  deal.status = 'negotiating';
  addTimelineEvent(deal, 'Counter Offer Sent', message || 'Counter offer sent', req.user._id, { budget, deadline });
  await deal.save();

  // Notify other party
  const notifyUserId = actorRole === 'brand' ? deal.creatorId : deal.brandId;
  await Notification.create({
    userId: notifyUserId,
    type: 'deal',
    title: 'Counter Offer Received',
    message: message || 'You have received a counter offer',
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: 'Counter offer sent' });
});

// ==================== SUBMIT DELIVERABLES ====================
exports.submitDeliverables = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { deliverables } = req.body;

  if (!deliverables || !Array.isArray(deliverables) || deliverables.length === 0) {
    return res.status(400).json({ success: false, error: 'Deliverables array required' });
  }

  const deal = await Deal.findOne({
    _id: id,
    creatorId: req.user._id,
    status: { $in: ['accepted', 'in-progress', 'revision'] },
  });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot submit deliverables' });
  }

  const errors = [];
  for (const submission of deliverables) {
    const { deliverableId, files = [], links = [], notes } = submission;
    const deliverable = deal.deliverables.id(deliverableId);
    if (!deliverable) {
      errors.push(`Deliverable ${deliverableId} not found`);
      continue;
    }

    deliverable.status = 'submitted';
    deliverable.submittedAt = new Date();
    if (files.length) deliverable.files.push(...files);
    if (links.length) deliverable.links.push(...links);
    if (notes) deliverable.notes = notes;
  }

  if (errors.length === deliverables.length) {
    return res.status(400).json({ success: false, errors });
  }

  // Auto-transition to in-progress if currently accepted
  if (deal.status === 'accepted') {
    deal.status = 'in-progress';
    addTimelineEvent(deal, 'Work Started', 'Creator submitted first deliverables', req.user._id);
  }

  addTimelineEvent(deal, 'Deliverables Submitted', `${deliverables.length} deliverable(s) submitted`, req.user._id);
  await deal.save();

  // Notify brand
  await Notification.create({
    userId: deal.brandId,
    type: 'deal',
    title: 'Deliverables Submitted',
    message: `Creator has submitted ${deliverables.length} deliverable(s) for review`,
    data: { dealId: deal._id, url: `/brand/deals/${deal._id}` },
  });

  res.json({
    success: true,
    message: 'Deliverables submitted',
    warnings: errors.length ? errors : undefined,
  });
});

// ==================== APPROVE DELIVERABLE ====================
exports.approveDeliverable = catchAsync(async (req, res) => {
  const { id, deliverableId } = req.params;
  const { feedback } = req.body;
  const brandId = getBrandContextId(req);

  const deal = await Deal.findOne({
    _id: id,
    brandId,
    status: { $in: ['in-progress', 'revision'] },
  });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or cannot approve' });
  }

  const deliverable = deal.deliverables.id(deliverableId);
  if (!deliverable) {
    return res.status(404).json({ success: false, error: 'Deliverable not found' });
  }

  if (deliverable.status !== 'submitted') {
    return res.status(400).json({ success: false, error: 'Deliverable not in submitted state' });
  }

  deliverable.status = 'approved';
  deliverable.approvedAt = new Date();
  if (feedback) deliverable.feedback = feedback;

  addTimelineEvent(deal, 'Deliverable Approved', `Deliverable "${deliverable.type}" approved`, req.user._id);
  await deal.save();

  // Check if all deliverables approved -> auto-complete
  const allApproved = deal.deliverables.every(d => d.status === 'approved');
  if (allApproved) {
    deal.status = 'completed';
    deal.completedAt = new Date();
    deal.paymentStatus = 'released';
    await deal.save();

    await Creator.findByIdAndUpdate(deal.creatorId, {
      $inc: {
        'stats.totalEarnings': deal.netAmount || deal.budget,
        'stats.completedCampaigns': 1,
      },
    });

    await ensureReleasedPaymentRecord(deal, req.user._id);

    await Notification.create({
      userId: deal.creatorId,
      type: 'payment',
      title: 'Payment Released',
      message: `$${deal.budget} released — all deliverables approved!`,
      data: { dealId: deal._id, url: '/creator/earnings' },
    });

    return res.json({
      success: true,
      message: 'Deliverable approved — deal completed and payment released',
      allApproved: true,
    });
  }

  await Notification.create({
    userId: deal.creatorId,
    type: 'deal',
    title: 'Deliverable Approved',
    message: `Your ${deliverable.type} deliverable was approved`,
    data: { dealId: deal._id },
  });

  res.json({ success: true, message: 'Deliverable approved' });
});

// ==================== RATE DEAL ====================
exports.rateDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { score, review, criteria } = req.body;
  const brandId = getBrandContextId(req);

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
  }

  const deal = await Deal.findOne({
    _id: id,
    $or: [{ brandId }, { creatorId: req.user._id }],
    status: 'completed',
  });

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or not completed' });
  }

  // Check if already rated
  if (deal.rating?.from?.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, error: 'You have already rated this deal' });
  }

  deal.rating = {
    score,
    review: review || '',
    from: req.user._id,
    criteria: {
      communication: criteria?.communication,
      quality: criteria?.quality,
      timeliness: criteria?.timeliness,
      professionalism: criteria?.professionalism,
    },
    createdAt: new Date(),
  };
  addTimelineEvent(deal, 'Deal Rated', `Rated ${score}/5${review ? `: ${review}` : ''}`, req.user._id);
  await deal.save();

  // Update rated user's average rating
  const actorRole = getActorRoleOnDeal(deal, req);
  const ratedUserId = actorRole === 'brand' ? deal.creatorId : deal.brandId;
  const allRatings = await Deal.find({
    $or: [{ brandId: ratedUserId }, { creatorId: ratedUserId }],
    'rating.score': { $exists: true },
  });
  const avgRating = allRatings.reduce((sum, d) => sum + d.rating.score, 0) / allRatings.length;

  await User.findByIdAndUpdate(ratedUserId, { 'stats.averageRating': avgRating, 'stats.totalReviews': allRatings.length });

  res.json({ success: true, message: 'Rating submitted' });
});

// ==================== MESSAGES ====================
exports.getDealMessages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const brandContextId = getBrandContextId(req);

  const deal = await Deal.findById(id);
  if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const messages = await Message.find({ dealId: deal._id })
    .populate('senderId', 'fullName displayName profilePicture')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, messages: messages.reverse() });
});

exports.sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { content, attachments = [] } = req.body;
  const brandContextId = getBrandContextId(req);

  if (!content && attachments.length === 0) {
    return res.status(400).json({ success: false, error: 'Message content or attachments required' });
  }

  const deal = await Deal.findById(id);
  if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  if (!deal.conversationId) {
    const conversation = new Conversation({
      conversation_id: buildConversationId(deal._id),
      type: 'deal',
      deal_id: deal._id,
      participants: [
        { user_id: deal.brandId, user_type: 'brand' },
        { user_id: deal.creatorId, user_type: 'creator' },
      ],
      participant_count: 2,
      created_by: { user_id: deal.brandId, user_type: 'brand' },
    });

    await conversation.save();
    deal.conversationId = conversation._id;
    await deal.save();
  }

  const message = new Message({
    dealId: deal._id,
    conversationId: deal.conversationId,
    senderId: req.user._id,
    content,
    attachments,
    contentType: 'text',
  });
  await message.save();
  await message.populate('senderId', 'fullName displayName profilePicture brandName');

  if (deal.conversationId) {
    await Conversation.findByIdAndUpdate(deal.conversationId, {
      $set: {
        'last_message.message_id': message._id,
        'last_message.content': content,
        'last_message.sender_id': req.user._id,
        'last_message.created_at': new Date(),
        'last_message.type': 'text',
        updated_at: new Date(),
      },
      $inc: { message_count: 1 },
    });
  }

  // Notify other party
  const actorRole = getActorRoleOnDeal(deal, req);
  const notifyUserId = actorRole === 'brand' ? deal.creatorId : deal.brandId;
  await Notification.create({
    userId: notifyUserId,
    type: 'message',
    title: 'New Message',
    message: `New message regarding deal "${deal.campaignId?.title || 'Deal'}"`,
    data: { dealId: deal._id },
  });

  const io = req.app.get('io');
  if (io && deal.conversationId) {
    io.to(`conversation_${deal.conversationId}`).emit('new_message', message);
  }

  res.json({ success: true, message });
});

// ==================== PERFORMANCE METRICS ====================
exports.updatePerformanceMetrics = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { metrics, finalize = false } = req.body;
  const brandContextId = getBrandContextId(req);

  const deal = await Deal.findById(id);
  if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  // Update metrics
  deal.metrics = { ...deal.metrics, ...metrics };
  if (!deal.metrics.history) deal.metrics.history = [];
  deal.metrics.history.push({ date: new Date(), ...metrics });

  // For performance-based deals, calculate payment
  if (deal.paymentType !== 'fixed' && deal.performancePaymentId && finalize) {
    const PaymentCalculator = require('../services/paymentCalculator');
    const calculation = await PaymentCalculator.calculatePerformancePayment(deal, deal.paymentType, metrics);

    deal.budget = calculation.finalAmount;
    deal.netAmount = calculation.finalAmount - calculation.fees.total;
    deal.metadata = { ...deal.metadata, performanceCalculation: calculation };

    // Create payment record
    await Payment.create({
      type: 'performance',
      status: 'in-escrow',
      amount: calculation.finalAmount,
      fee: calculation.fees.total,
      netAmount: calculation.finalAmount - calculation.fees.total,
      from: { userId: deal.brandId, accountType: 'brand' },
      to: { userId: deal.creatorId, accountType: 'creator' },
      dealId: deal._id,
      campaignId: deal.campaignId,
      performancePaymentId: deal.performancePaymentId,
      description: `Performance payment for ${deal.paymentType}`,
      metadata: { calculation },
    });

    deal.paymentStatus = 'in-escrow';
  }

  await deal.save();

  res.json({ success: true, message: 'Metrics updated' });
});

exports.getPerformanceSummary = catchAsync(async (req, res) => {
  const { id } = req.params;
  const brandContextId = getBrandContextId(req);

  const deal = await Deal.findById(id).populate('performancePaymentId');
  if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
  if (!canUserAct(deal, req.user._id, null, brandContextId)) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const summary = deal.getPerformanceSummary ? deal.getPerformanceSummary() : {
    dealId: deal._id,
    paymentType: deal.paymentType,
    budget: deal.budget,
    metrics: deal.metrics,
    roi: deal.roi,
  };

  res.json({ success: true, summary });
});

// ==================== DEAL STATS ====================
exports.getDealStats = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const brandId = getBrandContextId(req);
  const userType = req.user.userType;

  const query = userType === 'brand' ? { brandId } : { creatorId: userId };

  const [total, active, completed, pending, performance, value, avgValue] = await Promise.all([
    Deal.countDocuments(query),
    Deal.countDocuments({ ...query, status: { $in: ['accepted', 'in-progress'] } }),
    Deal.countDocuments({ ...query, status: 'completed' }),
    Deal.countDocuments({ ...query, status: 'pending' }),
    Deal.countDocuments({ ...query, paymentType: { $in: ['cpe', 'cpa', 'cpm'] } }),
    Deal.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$budget' } } }]),
    Deal.aggregate([{ $match: { ...query, status: 'completed' } }, { $group: { _id: null, avg: { $avg: '$budget' } } }]),
  ]);

  res.json({
    success: true,
    stats: {
      total,
      active,
      completed,
      pending,
      performance,
      totalValue: value[0]?.total || 0,
      averageValue: avgValue[0]?.avg || 0,
    },
  });
});

// ==================== CREATE PERFORMANCE DEAL ====================
exports.createPerformanceDeal = catchAsync(async (req, res) => {
  const brandId = getBrandContextId(req);
  const {
    campaignId,
    creatorId,
    budget,
    deadline,
    deliverables,
    terms,
    paymentType,
    performanceMetrics,
    requirements,
  } = req.body;

  // Validate required fields
  if (!campaignId || !creatorId || !budget || !deadline || !paymentType) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: campaignId, creatorId, budget, deadline, paymentType',
    });
  }

  // Validate paymentType is a performance type
  const performanceTypes = ['cpe', 'cpa', 'cpm', 'revenue_share', 'hybrid'];
  if (!performanceTypes.includes(paymentType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid performance payment type. Must be one of: ${performanceTypes.join(', ')}`,
    });
  }

  // Validate IDs
  if (!isValidObjectId(campaignId) || !isValidObjectId(creatorId)) {
    return res.status(400).json({ success: false, error: 'Invalid campaign or creator ID' });
  }

  // Validate budget
  if (!isValidBudget(budget)) {
    return res.status(400).json({ success: false, error: 'Budget must be between $10 and $1,000,000' });
  }

  // Validate deadline
  if (!isValidFutureDate(deadline)) {
    return res.status(400).json({ success: false, error: 'Deadline must be in the future' });
  }

  // Check campaign exists and belongs to brand
  const campaign = await Campaign.findOne({ _id: campaignId, brandId });
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found or not owned by you' });
  }

  // Check creator exists
  const creator = await Creator.findById(creatorId);
  if (!creator) {
    return res.status(404).json({ success: false, error: 'Creator not found' });
  }

  // Check for existing active deal
  const existingDeal = await Deal.findOne({
    campaignId,
    creatorId,
    brandId,
    status: { $in: ['pending', 'accepted', 'in-progress'] },
  });
  if (existingDeal) {
    return res.status(400).json({ success: false, error: 'An active deal already exists with this creator for this campaign' });
  }

  // Build performance metrics based on type
  const perfMetrics = {};
  if (performanceMetrics) {
    if (paymentType === 'cpe' && performanceMetrics.cpe) {
      perfMetrics.cpe = {
        targetLikes: performanceMetrics.cpe.targetLikes || 0,
        targetComments: performanceMetrics.cpe.targetComments || 0,
        targetShares: performanceMetrics.cpe.targetShares || 0,
        targetSaves: performanceMetrics.cpe.targetSaves || 0,
        bonusRate: performanceMetrics.cpe.bonusRate || 0.5,
        baseRate: performanceMetrics.cpe.baseRate || budget,
      };
    } else if (paymentType === 'cpa' && performanceMetrics.cpa) {
      perfMetrics.cpa = {
        targetConversions: performanceMetrics.cpa.targetConversions || 0,
        commissionRate: performanceMetrics.cpa.commissionRate || 0.1,
        baseRate: performanceMetrics.cpa.baseRate || budget,
      };
    } else if (paymentType === 'cpm' && performanceMetrics.cpm) {
      perfMetrics.cpm = {
        targetImpressions: performanceMetrics.cpm.targetImpressions || 0,
        cpmRate: performanceMetrics.cpm.cpmRate || 10,
        baseRate: performanceMetrics.cpm.baseRate || budget,
      };
    } else if (paymentType === 'revenue_share' && performanceMetrics.revenueShare) {
      perfMetrics.revenueShare = {
        sharePercentage: performanceMetrics.revenueShare.sharePercentage || 20,
        minimumGuarantee: performanceMetrics.revenueShare.minimumGuarantee || 0,
      };
    } else if (paymentType === 'hybrid' && performanceMetrics.hybrid) {
      perfMetrics.hybrid = {
        basePortion: performanceMetrics.hybrid.basePortion || budget * 0.5,
        performancePortion: performanceMetrics.hybrid.performancePortion || budget * 0.5,
        performanceWeight: performanceMetrics.hybrid.performanceWeight || 0.5,
      };
    }
  }

  // Create performance deal
  const deal = new Deal({
    campaignId,
    brandId,
    creatorId,
    budget,
    deadline,
    deliverables: deliverables || [],
    terms,
    paymentTerms: 'performance',
    paymentType,
    type: 'performance',
    performanceMetrics: perfMetrics,
    requirements: requirements || [],
    status: 'pending',
    createdBy: req.user._id,
  });

  addTimelineEvent(
    deal,
    'Performance Deal Created',
    `Performance-based deal (${paymentType.toUpperCase()}) sent to ${creator.displayName}`,
    req.user._id,
    { paymentType, budget }
  );

  await deal.save();

  // Create conversation for deal
  const conversation = new Conversation({
    conversation_id: buildConversationId(deal._id),
    type: 'deal',
    deal_id: deal._id,
    participants: [
      { user_id: deal.brandId, user_type: 'brand' },
      { user_id: deal.creatorId, user_type: 'creator' },
    ],
    participant_count: 2,
    created_by: { user_id: deal.brandId, user_type: 'brand' },
  });
  await conversation.save();

  // System message
  await Message.create({
    conversationId: conversation._id,
    senderId: deal.brandId,
    content: `A new performance-based deal (${paymentType.toUpperCase()}) has been created. Base budget: $${budget}, Deadline: ${new Date(deadline).toLocaleDateString()}`,
    contentType: 'text',
  });

  deal.conversationId = conversation._id;
  await deal.save();

  // Update campaign
  await Campaign.findByIdAndUpdate(campaignId, {
    $push: {
      invitedCreators: {
        creatorId,
        status: 'pending',
        invitedAt: new Date(),
      },
    },
  });

  // Notify creator
  await Notification.create({
    userId: creatorId,
    type: 'deal',
    title: 'New Performance Deal Offer',
    message: `You've received a performance-based (${paymentType.toUpperCase()}) deal offer for "${campaign.title}" worth $${budget}`,
    data: { dealId: deal._id, url: `/creator/deals/${deal._id}` },
  });

  res.status(201).json({
    success: true,
    message: 'Performance deal offer sent',
    deal,
  });
});

// ==================== UPDATE DEAL ====================
exports.updateDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const brandContextId = getBrandContextId(req);
  const {
    budget,
    deadline,
    deliverables,
    terms,
    requirements,
    paymentTerms,
    paymentType,
    performanceMetrics,
  } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid deal ID' });
  }

  const deal = await Deal.findById(id)
    .populate('creatorId', 'displayName handle profilePicture')
    .populate('campaignId', 'title');

  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  // Only the brand who owns the deal can update it
  if (!canUserAct(deal, req.user._id, 'brand', brandContextId)) {
    return res.status(403).json({ success: false, error: 'Only the deal owner (brand) can update this deal' });
  }

  // Only allow updates on certain statuses
  const updatableStatuses = ['pending', 'negotiating', 'accepted'];
  if (!updatableStatuses.includes(deal.status)) {
    return res.status(400).json({
      success: false,
      error: `Deal cannot be updated in "${deal.status}" status. Allowed statuses: ${updatableStatuses.join(', ')}`,
    });
  }

  // Track changes for the timeline
  const changes = [];

  if (budget !== undefined) {
    if (!isValidBudget(budget)) {
      return res.status(400).json({ success: false, error: 'Budget must be between $10 and $1,000,000' });
    }
    if (deal.budget !== budget) {
      changes.push(`Budget: $${deal.budget} → $${budget}`);
      deal.budget = budget;
    }
  }

  if (deadline !== undefined) {
    if (!isValidFutureDate(deadline)) {
      return res.status(400).json({ success: false, error: 'Deadline must be in the future' });
    }
    const oldDeadline = deal.deadline ? deal.deadline.toLocaleDateString() : 'none';
    const newDeadline = new Date(deadline).toLocaleDateString();
    if (oldDeadline !== newDeadline) {
      changes.push(`Deadline: ${oldDeadline} → ${newDeadline}`);
      deal.deadline = deadline;
    }
  }

  if (deliverables !== undefined && Array.isArray(deliverables)) {
    changes.push(`Deliverables updated (${deliverables.length} items)`);
    deal.deliverables = deliverables;
  }

  if (terms !== undefined) {
    changes.push('Terms updated');
    deal.terms = terms;
  }

  if (requirements !== undefined && Array.isArray(requirements)) {
    changes.push('Requirements updated');
    deal.requirements = requirements;
  }

  if (paymentTerms !== undefined) {
    deal.paymentTerms = paymentTerms;
    changes.push(`Payment terms: ${paymentTerms}`);
  }

  if (paymentType !== undefined) {
    deal.paymentType = paymentType;
    changes.push(`Payment type: ${paymentType}`);
  }

  if (performanceMetrics !== undefined) {
    deal.performanceMetrics = { ...deal.performanceMetrics, ...performanceMetrics };
    changes.push('Performance metrics updated');
  }

  if (changes.length === 0) {
    return res.status(400).json({ success: false, error: 'No changes provided' });
  }

  // Log the update
  addTimelineEvent(
    deal,
    'Deal Updated',
    `Deal terms updated: ${changes.join(', ')}`,
    req.user._id,
    { changes }
  );

  await deal.save();

  // Notify the creator about the update
  if (deal.creatorId) {
    const creatorUserId = deal.creatorId._id || deal.creatorId;
    await Notification.create({
      userId: creatorUserId,
      type: 'deal',
      title: 'Deal Updated',
      message: `The deal for "${deal.campaignId?.title || 'a campaign'}" has been updated: ${changes.join(', ')}`,
      data: { dealId: deal._id, url: `/creator/deals/${deal._id}` },
    });
  }

  res.json({
    success: true,
    message: 'Deal updated successfully',
    deal,
    changes,
  });
});