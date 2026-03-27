// controllers/disputeController.js - COMPLETE FIXED VERSION
const Dispute = require('../models/Dispute');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');

// @desc    Create dispute
// @route   POST /api/disputes
// @access  Private
const createDispute = asyncHandler(async (req, res) => {
  const {
    dealId,
    deal_id,
    type,
    dispute_type,
    title,
    reason,
    description,
    evidence
  } = req.body;

  const normalizedDealId = dealId || deal_id;
  const normalizedType = type || dispute_type;
  const normalizedReason = (reason || title || '').trim().slice(0, 500);

  // Validation
  if (!normalizedDealId || !normalizedType || !normalizedReason || !description) {
    res.status(400);
    throw new Error('Deal ID, type, reason/title, and description are required');
  }

  const deal = await Deal.findById(normalizedDealId);

  if (!deal) {
    res.status(404);
    throw new Error('Deal not found');
  }

  // Check if user is part of the deal
  if (deal.brandId.toString() !== req.user._id.toString() && 
      deal.creatorId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Check if dispute already exists
  const existingDispute = await Dispute.findOne({
    $or: [
      { deal_id: normalizedDealId },
      { dealId: normalizedDealId }
    ]
  });
  if (existingDispute) {
    res.status(400);
    throw new Error('A dispute already exists for this deal');
  }

  const against = req.user._id.toString() === deal.brandId.toString() 
    ? deal.creatorId 
    : deal.brandId;

  // Process evidence files if any
  let processedEvidence = [];
  if (evidence && evidence.length > 0) {
    processedEvidence = evidence
      .map((e) => ({
        file_name: e.file_name || e.fileName || e.filename || 'Evidence file',
        file_url: e.file_url || e.fileUrl || e.url,
        file_type: e.file_type || e.fileType || e.type || 'file',
        uploaded_by: {
          user_id: req.user._id,
          user_type: req.user.userType
        },
        uploaded_at: new Date()
      }))
      .filter((item) => Boolean(item.file_url));
  }

  const dispute = await Dispute.create({
    deal_id: normalizedDealId,
    campaign_id: deal.campaignId,
    raised_by: {
      user_id: req.user._id,
      user_type: req.user.userType
    },
    raised_against: {
      user_id: against,
      user_type: req.user.userType === 'brand' ? 'creator' : 'brand'
    },
    dispute_type: normalizedType,
    reason: normalizedReason,
    description,
    evidence: processedEvidence,
    status: 'open',
    priority: 'medium',
    timeline: [{
      action: 'created',
      description: 'Dispute created',
      performed_by: {
        user_id: req.user._id,
        user_type: req.user.userType
      },
      timestamp: new Date()
    }],
    created_at: new Date()
  });

  // Update deal status
  deal.status = 'disputed';
  deal.disputeId = dispute._id;
  await deal.save();

  // Notify other party
  await Notification.create({
    userId: against,
    type: 'alert',
    title: 'Dispute Filed',
    message: `A dispute has been filed regarding your deal "${deal.campaignId?.title || 'Deal'}"`,
    priority: 'high',
    data: {
      dealId: normalizedDealId,
      disputeId: dispute._id,
      url: `/disputes/${dispute._id}`
    }
  });

  // Notify admins
  const admins = await User.find({ userType: 'admin' });
  for (const admin of admins) {
    await Notification.create({
      userId: admin._id,
      type: 'alert',
      title: 'New Dispute',
      message: `A new dispute requires attention: ${normalizedReason}`,
      priority: 'high',
      data: {
        dealId: normalizedDealId,
        disputeId: dispute._id,
        url: `/admin/disputes/${dispute._id}`
      }
    });
  }

  res.status(201).json({
    success: true,
    dispute
  });
});

// @desc    Upload evidence for dispute
// @route   POST /api/disputes/:id/evidence
// @access  Private
const uploadEvidence = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  // Check if user is part of the dispute
  if (dispute.raisedBy.userId.toString() !== req.user._id.toString() &&
      dispute.against.userId.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  // Upload to cloudinary
  let fileUrl = '';
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'disputes',
      resource_type: 'auto'
    });
    fileUrl = result.secure_url;
  } else {
    fileUrl = `/uploads/${req.file.filename}`;
  }

  const evidenceItem = {
    url: fileUrl,
    type: req.file.mimetype.split('/')[0],
    description: req.body.description || '',
    uploadedBy: req.user._id,
    uploadedAt: new Date()
  };

  dispute.evidence.push(evidenceItem);
  await dispute.save();

  res.json({
    success: true,
    evidence: evidenceItem
  });
});

// @desc    Get disputes (admin)
// @route   GET /api/disputes
// @access  Private/Admin
const getDisputes = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;

  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;

  const [disputes, total] = await Promise.all([
    Dispute.find(query)
      .populate('raisedBy.userId', 'fullName email userType')
      .populate('against.userId', 'fullName email userType')
      .populate('dealId')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Dispute.countDocuments(query)
  ]);

  res.json({
    success: true,
    disputes,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

// @desc    Get user disputes
// @route   GET /api/disputes/user
// @access  Private
const getUserDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({
    $or: [
      { 'raisedBy.userId': req.user._id },
      { 'against.userId': req.user._id }
    ]
  })
    .populate('raisedBy.userId', 'fullName')
    .populate('against.userId', 'fullName')
    .populate('dealId')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    disputes
  });
});

// @desc    Get single dispute
// @route   GET /api/disputes/:id
// @access  Private
const getDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id)
    .populate('raisedBy.userId', 'fullName email profilePicture userType')
    .populate('against.userId', 'fullName email profilePicture userType')
    .populate('dealId')
    .populate('assignedTo', 'fullName email')
    .populate('messages.from', 'fullName profilePicture');

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  // Check authorization
  if (dispute.raisedBy.userId._id.toString() !== req.user._id.toString() &&
      dispute.against.userId._id.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({
    success: true,
    dispute
  });
});

// @desc    Add message to dispute
// @route   POST /api/disputes/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res) => {
  const { content, attachments, isInternal } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Message content is required');
  }

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  // Check authorization
  if (dispute.raisedBy.userId.toString() !== req.user._id.toString() &&
      dispute.against.userId.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Internal messages only for admins
  if (isInternal && req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to send internal messages');
  }

  // Process attachments
  let processedAttachments = [];
  if (attachments && attachments.length > 0) {
    processedAttachments = attachments.map(a => ({
      ...a,
      uploadedAt: new Date()
    }));
  }

  dispute.messages.push({
    from: req.user._id,
    content,
    attachments: processedAttachments,
    isInternal: isInternal || false,
    createdAt: new Date()
  });

  await dispute.save();

  // Notify other party (if not internal)
  if (!isInternal) {
    const notifyUserId = req.user._id.toString() === dispute.raisedBy.userId.toString()
      ? dispute.against.userId
      : dispute.raisedBy.userId;

    await Notification.create({
      userId: notifyUserId,
      type: 'alert',
      title: 'New Dispute Message',
      message: `New message in dispute #${dispute._id}`,
      data: {
        disputeId: dispute._id,
        url: `/disputes/${dispute._id}`
      }
    });
  }

  // Notify admins if user added message
  if (!isInternal && req.user.userType !== 'admin') {
    const admins = await User.find({ userType: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'alert',
        title: 'New Dispute Message',
        message: `New message in dispute #${dispute._id}`,
        data: { disputeId: dispute._id }
      });
    }
  }

  res.json({
    success: true,
    message: 'Message added',
    dispute
  });
});

// @desc    Update dispute status (admin)
// @route   PUT /api/disputes/:id/status
// @access  Private/Admin
const updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  const oldStatus = dispute.status;
  dispute.status = status;
  
  if (notes) {
    dispute.messages.push({
      from: req.user._id,
      content: notes,
      isInternal: false,
      createdAt: new Date()
    });
  }

  if (status === 'resolved') {
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
  }

  await dispute.save();

  // Notify both parties
  const parties = [dispute.raisedBy.userId, dispute.against.userId];
  for (const userId of parties) {
    await Notification.create({
      userId,
      type: 'alert',
      title: 'Dispute Status Updated',
      message: `Dispute status changed from ${oldStatus} to ${status}`,
      data: {
        disputeId: dispute._id,
        url: `/disputes/${dispute._id}`
      }
    });
  }

  res.json({
    success: true,
    message: 'Dispute status updated',
    dispute
  });
});

// @desc    Propose resolution
// @route   POST /api/disputes/:id/resolution
// @access  Private/Admin
const proposeResolution = asyncHandler(async (req, res) => {
  const { type, details, amount } = req.body;

  if (!type || !details) {
    res.status(400);
    throw new Error('Resolution type and details are required');
  }

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  dispute.proposedResolution = {
    type,
    details,
    amount: amount || 0,
    proposedBy: req.user._id,
    proposedAt: new Date(),
    acceptedBy: [],
    rejectedBy: []
  };

  await dispute.save();

  // Notify both parties
  const parties = [dispute.raisedBy.userId, dispute.against.userId];
  for (const userId of parties) {
    await Notification.create({
      userId,
      type: 'alert',
      title: 'Resolution Proposed',
      message: `A resolution has been proposed for your dispute`,
      priority: 'high',
      data: {
        disputeId: dispute._id,
        url: `/disputes/${dispute._id}`
      }
    });
  }

  res.json({
    success: true,
    message: 'Resolution proposed',
    dispute
  });
});

// @desc    Accept resolution
// @route   POST /api/disputes/:id/accept-resolution
// @access  Private
const acceptResolution = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  if (!dispute.proposedResolution) {
    res.status(400);
    throw new Error('No resolution proposed');
  }

  // Check if user is part of dispute
  if (dispute.raisedBy.userId.toString() !== req.user._id.toString() &&
      dispute.against.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Check if already accepted
  if (dispute.proposedResolution.acceptedBy.includes(req.user._id)) {
    res.status(400);
    throw new Error('You have already accepted this resolution');
  }

  dispute.proposedResolution.acceptedBy.push(req.user._id);

  // Check if both parties accepted
  const bothAccepted = 
    dispute.proposedResolution.acceptedBy.includes(dispute.raisedBy.userId) &&
    dispute.proposedResolution.acceptedBy.includes(dispute.against.userId);

  if (bothAccepted) {
    dispute.status = 'resolved';
    dispute.resolution = dispute.proposedResolution;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();

    // Update deal if needed
    const deal = await Deal.findById(dispute.dealId);
    if (deal) {
      // Apply resolution to deal
      if (dispute.proposedResolution.type === 'refund') {
        // Process refund
        deal.paymentStatus = 'refunded';
      } else if (dispute.proposedResolution.type === 'partial_refund') {
        // Process partial refund
        deal.paymentStatus = 'partially_refunded';
      } else if (dispute.proposedResolution.type === 'complete_payment') {
        // Complete payment
        deal.paymentStatus = 'released';
        deal.status = 'completed';
      }
      await deal.save();
    }
  }

  await dispute.save();

  res.json({
    success: true,
    message: bothAccepted ? 'Dispute resolved' : 'Resolution accepted',
    dispute
  });
});

// @desc    Reject resolution
// @route   POST /api/disputes/:id/reject-resolution
// @access  Private
const rejectResolution = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  if (!dispute.proposedResolution) {
    res.status(400);
    throw new Error('No resolution proposed');
  }

  // Check if user is part of dispute
  if (dispute.raisedBy.userId.toString() !== req.user._id.toString() &&
      dispute.against.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  dispute.proposedResolution.rejectedBy.push(req.user._id);
  
  // Add message about rejection
  dispute.messages.push({
    from: req.user._id,
    content: reason || 'Resolution rejected',
    isInternal: false,
    createdAt: new Date()
  });

  await dispute.save();

  res.json({
    success: true,
    message: 'Resolution rejected',
    dispute
  });
});

// @desc    Assign dispute (admin)
// @route   POST /api/disputes/:id/assign
// @access  Private/Admin
const assignDispute = asyncHandler(async (req, res) => {
  const { adminId } = req.body;

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  dispute.assignedTo = adminId;
  await dispute.save();

  // Notify assigned admin
  await Notification.create({
    userId: adminId,
    type: 'alert',
    title: 'Dispute Assigned',
    message: `Dispute #${dispute._id} has been assigned to you`,
    data: { disputeId: dispute._id }
  });

  res.json({
    success: true,
    message: 'Dispute assigned',
    dispute
  });
});

// @desc    Escalate dispute
// @route   POST /api/disputes/:id/escalate
// @access  Private
const escalateDispute = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    res.status(404);
    throw new Error('Dispute not found');
  }

  dispute.escalatedTo = 'manager';
  dispute.escalatedAt = new Date();
  dispute.escalationReason = reason;
  dispute.priority = 'high';

  await dispute.save();

  // Notify admins
  const admins = await User.find({ userType: 'admin' });
  for (const admin of admins) {
    await Notification.create({
      userId: admin._id,
      type: 'alert',
      title: 'Dispute Escalated',
      message: `Dispute #${dispute._id} has been escalated. Reason: ${reason}`,
      priority: 'high',
      data: {
        disputeId: dispute._id,
        url: `/admin/disputes/${dispute._id}`
      }
    });
  }

  res.json({
    success: true,
    message: 'Dispute escalated',
    dispute
  });
});

// @desc    Get dispute statistics (admin)
// @route   GET /api/disputes/stats
// @access  Private/Admin
const getDisputeStats = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  let startDate = new Date();
  if (period === '7d') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === '90d') {
    startDate.setDate(startDate.getDate() - 90);
  }

  const [total, open, resolved, byType, byPriority, timeline] = await Promise.all([
    Dispute.countDocuments({ createdAt: { $gte: startDate } }),
    Dispute.countDocuments({ status: 'open', createdAt: { $gte: startDate } }),
    Dispute.countDocuments({ status: 'resolved', createdAt: { $gte: startDate } }),
    Dispute.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Dispute.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    Dispute.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
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
    ])
  ]);

  // Calculate average resolution time
  const resolvedDisputes = await Dispute.find({
    status: 'resolved',
    resolvedAt: { $exists: true },
    createdAt: { $gte: startDate }
  });

  let avgResolutionTime = 0;
  if (resolvedDisputes.length > 0) {
    const totalTime = resolvedDisputes.reduce((sum, d) => {
      return sum + (d.resolvedAt - d.createdAt);
    }, 0);
    avgResolutionTime = totalTime / resolvedDisputes.length / (1000 * 60 * 60); // in hours
  }

  res.json({
    success: true,
    stats: {
      total,
      open,
      resolved,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      byType,
      byPriority,
      timeline
    }
  });
});

module.exports = {
  createDispute,
  uploadEvidence,
  getDisputes,
  getUserDisputes,
  getDispute,
  addMessage,
  updateStatus,
  proposeResolution,
  acceptResolution,
  rejectResolution,
  assignDispute,
  escalateDispute,
  getDisputeStats
};