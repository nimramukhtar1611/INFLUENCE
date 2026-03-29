// controllers/deliverableController.js
const Deliverable = require('../models/Deliverable');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

// @desc    Submit deliverable
// @route   POST /api/deliverables
// @access  Private (Creator)
// @desc    Submit deliverable
// @route   POST /api/deliverables
// @access  Private (Creator)
const submitDeliverable = asyncHandler(async (req, res) => {
  const { dealId, type, platform, description, files, links, notes, metrics } = req.body;

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
    metrics: metrics || {}, // Store metrics on submission
    status: 'submitted',
    submittedAt: Date.now()
  });

  // Aggregation logic for performance-based deals
  if (deal.paymentType !== 'fixed' && metrics) {
    // 1. Get all deliverables for this deal
    const allDeliverables = await Deliverable.find({ dealId });
    
    // 2. Aggregate metrics
    const totals = {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      conversions: 0,
      clicks: 0
    };

    allDeliverables.forEach(d => {
      if (d.metrics) {
        totals.impressions += (d.metrics.impressions || 0);
        totals.likes += (d.metrics.likes || 0);
        totals.comments += (d.metrics.comments || 0);
        totals.shares += (d.metrics.shares || 0);
        totals.conversions += (d.metrics.conversions || 0);
        totals.clicks += (d.metrics.clicks || 0);
      }
    });

    // 3. Update the deal's total metrics
    await deal.updatePerformanceMetrics(totals);
  }

  // Update deal status
  deal.status = 'in-progress';
  deal.timeline.push({
    event: 'Deliverables Submitted',
    description: `Creator submitted ${type} deliverables` + (metrics ? ' with performance data' : ''),
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

// ... (getDealDeliverables and getDeliverable unchanged)

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

  // Performance-based validation: Require 100% progress before approval
  if (deal.paymentType !== 'fixed') {
    // Calculate progress (simplified implementation based on dealController logic)
    // In a real scenario, this calculation would be shared
    let progress = 0;
    if (deal.paymentType === 'cpe' && deal.performanceMetrics.cpe) {
      progress = Math.round(((deal.metrics.likes || 0) + (deal.metrics.comments || 0)) / (deal.performanceMetrics.cpe.targetLikes || 1) * 100);
    } else if (deal.paymentType === 'cpa' && deal.performanceMetrics.cpa) {
      progress = Math.round((deal.metrics.conversions || 0) / (deal.performanceMetrics.cpa.targetConversions || 1) * 100);
    } else if (deal.paymentType === 'cpm' && deal.performanceMetrics.cpm) {
      progress = Math.round((deal.metrics.impressions || 0) / (deal.performanceMetrics.cpm.targetImpressions || 1) * 100);
    } else {
        // For revenue share, progress is harder to define, but let's assume always approvable or 100 if submission exists
        progress = 100; 
    }

    if (progress < 100) {
      res.status(400);
      throw new Error(`Performance targets not reached. Current progress is ${progress}%. Approved is only allowed at 100%.`);
    }
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

// ... (requestDeliverableRevision and updateDeliverableMetrics unchanged)

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
  const { impressions, likes, comments, shares, saves, clicks, conversions } = req.body;

  const deliverable = await Deliverable.findById(req.params.id);

  if (!deliverable) {
    res.status(404);
    throw new Error('Deliverable not found');
  }

  deliverable.metrics = {
    impressions,
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