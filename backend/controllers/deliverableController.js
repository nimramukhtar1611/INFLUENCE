// controllers/deliverableController.js
const Deliverable = require('../models/Deliverable');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

// @desc    Submit deliverable
// @route   POST /api/deliverables
// @access  Private (Creator)
const submitDeliverable = asyncHandler(async (req, res) => {
  const { dealId, type, platform, description, files, links, notes } = req.body;

  // Check if deal exists and belongs to creator
  const deal = await Deal.findById(dealId);
  if (!deal) {
    res.status(404);
    throw new Error('Deal not found');
  }

  if (deal.creatorId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (deal.status !== 'accepted' && deal.status !== 'in-progress' && deal.status !== 'revision') {
    res.status(400);
    throw new Error('Cannot submit deliverables at this stage');
  }

  const deliverable = await Deliverable.create({
    dealId,
    creatorId: req.user._id,
    brandId: deal.brandId,
    type,
    platform,
    description,
    files,
    links,
    notes,
    status: 'submitted',
    submittedAt: Date.now()
  });

  // Update deal status
  deal.status = 'in-progress';
  deal.timeline.push({
    event: 'Deliverables Submitted',
    description: `Creator submitted ${type} deliverables`,
    userId: req.user._id
  });
  await deal.save();

  // Notify brand
  await Notification.create({
    userId: deal.brandId,
    type: 'deal',
    title: 'Deliverables Submitted',
    message: `Creator has submitted deliverables for review`,
    data: {
      dealId: deal._id,
      deliverableId: deliverable._id
    }
  });

  res.status(201).json({
    success: true,
    deliverable
  });
});

// @desc    Get deliverables for deal
// @route   GET /api/deliverables/deal/:dealId
// @access  Private
const getDealDeliverables = asyncHandler(async (req, res) => {
  const deliverables = await Deliverable.find({ dealId: req.params.dealId })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    deliverables
  });
});

// @desc    Get single deliverable
// @route   GET /api/deliverables/:id
// @access  Private
const getDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await Deliverable.findById(req.params.id)
    .populate('creatorId', 'fullName displayName handle profilePicture')
    .populate('brandId', 'brandName logo');

  if (!deliverable) {
    res.status(404);
    throw new Error('Deliverable not found');
  }

  res.json({
    success: true,
    deliverable
  });
});

// @desc    Approve deliverable
// @route   POST /api/deliverables/:id/approve
// @access  Private (Brand)
const approveDeliverable = asyncHandler(async (req, res) => {
  const { feedback } = req.body;

  const deliverable = await Deliverable.findById(req.params.id);

  if (!deliverable) {
    res.status(404);
    throw new Error('Deliverable not found');
  }

  const deal = await Deal.findById(deliverable.dealId);

  if (deal.brandId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  deliverable.status = 'approved';
  deliverable.approvedAt = Date.now();
  if (feedback) {
    deliverable.feedback.push({
      from: req.user._id,
      content: feedback
    });
  }
  await deliverable.save();

  // Check if all deliverables are approved
  const allDeliverables = await Deliverable.find({ dealId: deliverable.dealId });
  const allApproved = allDeliverables.every(d => d.status === 'approved');

  if (allApproved) {
    deal.status = 'completed';
    deal.completedAt = Date.now();
    await deal.save();

    // Notify creator
    await Notification.create({
      userId: deal.creatorId,
      type: 'deal',
      title: 'All Deliverables Approved',
      message: 'All deliverables have been approved. Payment will be released soon.',
      data: {
        dealId: deal._id
      }
    });
  }

  // Notify creator
  await Notification.create({
    userId: deal.creatorId,
    type: 'deal',
    title: 'Deliverable Approved',
    message: 'Your deliverable has been approved',
    data: {
      dealId: deal._id,
      deliverableId: deliverable._id
    }
  });

  res.json({
    success: true,
    message: 'Deliverable approved',
    deliverable
  });
});

// @desc    Request revision for deliverable
// @route   POST /api/deliverables/:id/revision
// @access  Private (Brand)
const requestDeliverableRevision = asyncHandler(async (req, res) => {
  const { feedback } = req.body;

  const deliverable = await Deliverable.findById(req.params.id);

  if (!deliverable) {
    res.status(404);
    throw new Error('Deliverable not found');
  }

  const deal = await Deal.findById(deliverable.dealId);

  if (deal.brandId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  deliverable.status = 'revision';
  deliverable.revisionCount += 1;
  deliverable.revisionRequestedAt = Date.now();
  deliverable.feedback.push({
    from: req.user._id,
    content: feedback
  });
  await deliverable.save();

  // Update deal status
  deal.status = 'revision';
  deal.timeline.push({
    event: 'Revision Requested',
    description: `Brand requested revision for deliverables`,
    userId: req.user._id
  });
  await deal.save();

  // Notify creator
  await Notification.create({
    userId: deal.creatorId,
    type: 'deal',
    title: 'Revision Requested',
    message: 'Brand has requested revisions for your deliverable',
    data: {
      dealId: deal._id,
      deliverableId: deliverable._id,
      feedback
    }
  });

  res.json({
    success: true,
    message: 'Revision requested',
    deliverable
  });
});

// @desc    Update deliverable metrics
// @route   PUT /api/deliverables/:id/metrics
// @access  Private
const updateDeliverableMetrics = asyncHandler(async (req, res) => {
  const { views, likes, comments, shares, saves, clicks, conversions } = req.body;

  const deliverable = await Deliverable.findById(req.params.id);

  if (!deliverable) {
    res.status(404);
    throw new Error('Deliverable not found');
  }

  deliverable.metrics = {
    views,
    likes,
    comments,
    shares,
    saves,
    clicks,
    conversions
  };

  await deliverable.save();

  res.json({
    success: true,
    message: 'Metrics updated',
    deliverable
  });
});

module.exports = {
  submitDeliverable,
  getDealDeliverables,
  getDeliverable,
  approveDeliverable,
  requestDeliverableRevision,
  updateDeliverableMetrics
};