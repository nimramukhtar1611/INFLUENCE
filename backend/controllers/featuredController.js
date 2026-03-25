// controllers/featuredController.js - COMPLETE FIXED VERSION
const FeaturedListing = require('../models/FeaturedListing');
const Campaign = require('../models/Campaign');
const Creator = require('../models/Creator');
const Brand = require('../models/Brand');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const stripe = require('../config/stripe');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// ============================================================
// PUBLIC ROUTES
// ============================================================

// @desc    Get all active featured listings
// @route   GET /api/featured
// @access  Public
const getFeaturedListings = asyncHandler(async (req, res) => {
  const { type, placement, category, limit = 20, page = 1 } = req.query;

  const query = { status: 'active' };
  if (type) query.targetType = type;
  if (placement) query['placement.type'] = placement;
  if (category) query['placement.category'] = category;

  const [listings, total] = await Promise.all([
    FeaturedListing.find(query)
      .populate('targetId')
      .sort({ 'placement.priority': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    FeaturedListing.countDocuments(query)
  ]);

  res.json({
    success: true,
    listings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get featured listings by placement
// @route   GET /api/featured/placement/:placement
// @access  Public
const getListingsByPlacement = asyncHandler(async (req, res) => {
  const { placement } = req.params;
  const { category, limit = 10 } = req.query;

  const query = { 'placement.type': placement, status: 'active' };
  if (category) query['placement.category'] = category;

  const listings = await FeaturedListing.find(query)
    .populate('targetId')
    .sort({ 'placement.priority': -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, listings });
});

// @desc    Get available packages
// @route   GET /api/featured/packages
// @access  Public
const getPackages = asyncHandler(async (req, res) => {
  const packages = [
    {
      name: 'basic',
      displayName: 'Basic',
      price: 50,
      dailyRate: 5,
      duration: '7-30 days',
      features: [
        'Featured in search results',
        'Basic badge',
        'Standard placement',
        '5,000 guaranteed impressions'
      ],
      suitable: 'Individual creators and small campaigns'
    },
    {
      name: 'premium',
      displayName: 'Premium',
      price: 100,
      dailyRate: 10,
      duration: '14-60 days',
      features: [
        'Priority in search results',
        'Premium badge',
        'Homepage placement',
        'Category top placement',
        '25,000 guaranteed impressions',
        'Weekly performance report'
      ],
      suitable: 'Growing creators and medium brands',
      popular: true
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      price: 250,
      dailyRate: 25,
      duration: '30-90 days',
      features: [
        'Top placement in all sections',
        'Enterprise badge',
        'Homepage featured section',
        'Multiple category placements',
        'Email newsletter inclusion',
        '100,000 guaranteed impressions',
        'Dedicated support',
        'Custom branding options',
        'Daily performance tracking'
      ],
      suitable: 'Top creators and enterprise brands'
    }
  ];

  res.json({ success: true, packages });
});

// @desc    Calculate price for featured listing
// @route   POST /api/featured/calculate-price
// @access  Public
const calculatePrice = asyncHandler(async (req, res) => {
  const { package: packageName, days, placement, options } = req.body;

  const calculation = FeaturedListing.calculatePrice
    ? FeaturedListing.calculatePrice(packageName, days, { placement, ...options })
    : (() => {
        const rates = { basic: 5, premium: 10, enterprise: 25 };
        const dailyRate = rates[packageName] || 5;
        const subtotal = dailyRate * (days || 7);
        return { subtotal, total: subtotal, dailyRate, days };
      })();

  res.json({ success: true, calculation });
});

// @desc    Check availability for dates/placement
// @route   GET /api/featured/availability
// @access  Public
const getAvailability = asyncHandler(async (req, res) => {
  const { placement, startDate, endDate, category } = req.query;

  if (!placement || !startDate || !endDate) {
    res.status(400);
    throw new Error('placement, startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Count active listings for this placement in requested date range
  const query = {
    'placement.type': placement,
    status: { $in: ['active', 'pending'] },
    startDate: { $lte: end },
    endDate: { $gte: start }
  };
  if (category) query['placement.category'] = category;

  const overlappingCount = await FeaturedListing.countDocuments(query);

  // Define slot limits per placement (configurable)
  const slotLimits = {
    homepage: 5,
    search_top: 10,
    category_top: 8,
    sidebar: 15,
    default: 10
  };

  const maxSlots = slotLimits[placement] || slotLimits.default;
  const availableSlots = Math.max(0, maxSlots - overlappingCount);

  res.json({
    success: true,
    availability: {
      placement,
      startDate: start,
      endDate: end,
      maxSlots,
      occupiedSlots: overlappingCount,
      availableSlots,
      isAvailable: availableSlots > 0
    }
  });
});

// ============================================================
// TRACKING ROUTES (No auth)
// ============================================================

// @desc    Track impression
// @route   POST /api/featured/:id/track/impression
// @access  Public
const trackImpression = asyncHandler(async (req, res) => {
  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

  await listing.trackImpression();
  res.json({ success: true });
});

// @desc    Track click
// @route   POST /api/featured/:id/track/click
// @access  Public
const trackClick = asyncHandler(async (req, res) => {
  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

  await listing.trackClick();
  res.json({ success: true });
});

// @desc    Track conversion
// @route   POST /api/featured/:id/track/conversion
// @access  Public
const trackConversion = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

  await listing.trackConversion(value || 0);
  res.json({ success: true });
});

// ============================================================
// PROTECTED USER ROUTES
// ============================================================

// @desc    Create featured listing
// @route   POST /api/featured
// @access  Private
const createFeaturedListing = asyncHandler(async (req, res) => {
  const { targetType, targetId, placement, package: packageData, startDate, endDate, targeting } = req.body;

  // Validate target exists
  let targetExists = false;
  let targetModel = '';

  if (targetType === 'campaign') {
    targetExists = await Campaign.exists({ _id: targetId, brandId: req.user._id });
    targetModel = 'Campaign';
  } else if (targetType === 'creator') {
    targetExists = await Creator.exists({ _id: targetId });
    targetModel = 'Creator';
  } else if (targetType === 'brand') {
    targetExists = await Brand.exists({ _id: targetId });
    targetModel = 'Brand';
  }

  if (!targetExists) {
    res.status(404);
    throw new Error(`${targetType} not found or you don't have permission`);
  }

  // Check for overlapping listings
  const overlapping = await FeaturedListing.findOne({
    targetType,
    targetId,
    status: { $in: ['active', 'pending'] },
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) }
  });

  if (overlapping) {
    res.status(400);
    throw new Error('You already have a featured listing for this period');
  }

  // Calculate price
  const priceCalculation = FeaturedListing.calculatePrice
    ? FeaturedListing.calculatePrice(packageData.name, packageData.durationDays, { placement: placement.type })
    : { total: packageData.price || 0 };

  const featuredListing = new FeaturedListing({
    userId: req.user._id,
    targetType,
    targetId,
    targetModel,
    placement: {
      type: placement.type,
      category: placement.category,
      platform: placement.platform,
      priority: placement.priority || 1
    },
    startDate: startDate || new Date(),
    endDate,
    package: {
      name: packageData.name,
      price: priceCalculation.total,
      currency: 'USD',
      features: packageData.features || [],
      guaranteedImpressions: packageData.guaranteedImpressions,
      guaranteedClicks: packageData.guaranteedClicks
    },
    targeting,
    display: {
      title: req.body.title,
      description: req.body.description,
      image: req.body.image,
      badge: packageData.badge,
      priorityBadge: packageData.priorityBadge
    },
    status: 'pending',
    payment: { status: 'pending', amount: priceCalculation.total },
    createdBy: req.user._id
  });

  await featuredListing.save();

  if (priceCalculation.total > 0) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceCalculation.total * 100),
      currency: 'usd',
      metadata: {
        featuredListingId: featuredListing._id.toString(),
        userId: req.user._id.toString()
      }
    });

    featuredListing.payment.transactionId = paymentIntent.id;
    await featuredListing.save();

    return res.status(201).json({
      success: true,
      message: 'Featured listing created. Please complete payment.',
      featuredListing,
      clientSecret: paymentIntent.client_secret
    });
  }

  // Free listing — activate immediately
  featuredListing.status = 'active';
  featuredListing.payment.status = 'paid';
  featuredListing.payment.paidAt = new Date();
  await featuredListing.save();

  res.status(201).json({
    success: true,
    message: 'Featured listing created successfully',
    featuredListing
  });
});

// @desc    Get current user's featured listings
// @route   GET /api/featured/my-listings
// @access  Private
const getMyListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;

  const [listings, total] = await Promise.all([
    FeaturedListing.find(query)
      .populate('targetId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    FeaturedListing.countDocuments(query)
  ]);

  res.json({
    success: true,
    listings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single featured listing
// @route   GET /api/featured/:id
// @access  Private
const getFeaturedListing = asyncHandler(async (req, res) => {
  const listing = await FeaturedListing.findById(req.params.id)
    .populate('targetId')
    .populate('userId', 'fullName email')
    .lean();

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  if (
    listing.userId._id.toString() !== req.user._id.toString() &&
    req.user.userType !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({ success: true, listing });
});

// @desc    Update featured listing
// @route   PUT /api/featured/:id
// @access  Private
const updateFeaturedListing = asyncHandler(async (req, res) => {
  const listing = await FeaturedListing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  if (
    listing.userId.toString() !== req.user._id.toString() &&
    req.user.userType !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (listing.status !== 'pending' && listing.status !== 'paused') {
    res.status(400);
    throw new Error('Can only update pending or paused listings');
  }

  const { display, targeting, placement } = req.body;
  if (display) listing.display = { ...listing.display, ...display };
  if (targeting) listing.targeting = { ...listing.targeting, ...targeting };
  if (placement) listing.placement = { ...listing.placement, ...placement };

  listing.updatedAt = new Date();
  await listing.save();

  res.json({ success: true, message: 'Featured listing updated', listing });
});

// @desc    Cancel featured listing
// @route   POST /api/featured/:id/cancel
// @access  Private
const cancelFeaturedListing = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const listing = await FeaturedListing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  if (
    listing.userId.toString() !== req.user._id.toString() &&
    req.user.userType !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (listing.status !== 'active' && listing.status !== 'pending') {
    res.status(400);
    throw new Error('Cannot cancel this listing');
  }

  if (listing.cancel) {
    await listing.cancel(reason, req.user._id);
  } else {
    listing.status = 'cancelled';
    listing.cancellationReason = reason;
    listing.cancelledBy = req.user._id;
    listing.cancelledAt = new Date();
  }

  // Process proportional refund if paid
  if (listing.payment.status === 'paid' && listing.payment.amount > 0) {
    const daysUsed = Math.ceil((new Date() - listing.startDate) / (1000 * 60 * 60 * 24));
    const totalDays = listing.duration?.days || 1;
    const unusedDays = Math.max(0, totalDays - daysUsed);
    const refundAmount = (listing.package.price * (unusedDays / totalDays));

    if (refundAmount > 0 && listing.payment.transactionId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: listing.payment.transactionId,
          amount: Math.round(refundAmount * 100)
        });
        listing.payment.status = 'refunded';
        listing.payment.refundedAt = new Date();
        listing.metadata = { ...listing.metadata, refundId: refund.id, refundAmount };
      } catch (error) {
        console.error('Refund error:', error.message);
      }
    }
  }

  await listing.save();
  res.json({ success: true, message: 'Featured listing cancelled' });
});

// @desc    Extend featured listing
// @route   POST /api/featured/:id/extend
// @access  Private
const extendFeaturedListing = asyncHandler(async (req, res) => {
  const { days } = req.body;

  const listing = await FeaturedListing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  if (listing.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (listing.status !== 'active') {
    res.status(400);
    throw new Error('Can only extend active listings');
  }

  const totalDays = listing.duration?.days || 1;
  const dailyRate = listing.package.price / totalDays;
  const additionalCost = dailyRate * days;

  if (additionalCost > 0) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(additionalCost * 100),
      currency: 'usd',
      metadata: {
        featuredListingId: listing._id.toString(),
        extension: 'true',
        days: days.toString()
      }
    });

    return res.json({
      success: true,
      message: 'Extension requires payment',
      additionalCost,
      clientSecret: paymentIntent.client_secret,
      extensionData: { listingId: listing._id, days, amount: additionalCost }
    });
  }

  // Free extension
  if (listing.extend) {
    await listing.extend(days);
  } else {
    const currentEnd = new Date(listing.endDate);
    currentEnd.setDate(currentEnd.getDate() + days);
    listing.endDate = currentEnd;
    await listing.save();
  }

  res.json({ success: true, message: `Listing extended by ${days} days`, listing });
});

// @desc    Confirm extension payment
// @route   POST /api/featured/:id/confirm-extension
// @access  Private
const confirmExtension = asyncHandler(async (req, res) => {
  const { days, paymentIntentId } = req.body;

  const listing = await FeaturedListing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    res.status(400);
    throw new Error('Payment not completed');
  }

  if (listing.extend) {
    await listing.extend(days);
  } else {
    const currentEnd = new Date(listing.endDate);
    currentEnd.setDate(currentEnd.getDate() + days);
    listing.endDate = currentEnd;
  }

  listing.metadata = {
    ...listing.metadata,
    extensionPayments: [
      ...(listing.metadata?.extensionPayments || []),
      { date: new Date(), days, amount: paymentIntent.amount / 100, paymentIntentId }
    ]
  };

  await listing.save();

  res.json({ success: true, message: `Listing extended by ${days} days`, listing });
});

// @desc    Get performance stats for listing
// @route   GET /api/featured/:id/performance
// @access  Private
const getPerformanceStats = asyncHandler(async (req, res) => {
  const listing = await FeaturedListing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  if (
    listing.userId.toString() !== req.user._id.toString() &&
    req.user.userType !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const performance = listing.getPerformanceSummary
    ? listing.getPerformanceSummary()
    : {
        impressions: listing.performance?.impressions || 0,
        clicks: listing.performance?.clicks || 0,
        conversions: listing.performance?.conversions || 0,
        ctr: listing.performance?.ctr || 0,
        conversionRate: listing.performance?.conversionRate || 0,
        revenue: listing.performance?.revenue || 0
      };

  res.json({ success: true, performance });
});

// @desc    Get recommendations for current user
// @route   GET /api/featured/recommendations
// @access  Private
const getRecommendations = asyncHandler(async (req, res) => {
  // Build recommendations based on user's existing listings and activity
  const userListings = await FeaturedListing.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Find best-performing placements
  const topPlacements = await FeaturedListing.aggregate([
    { $match: { status: 'active', 'performance.impressions': { $gt: 0 } } },
    {
      $group: {
        _id: '$placement.type',
        avgCTR: { $avg: '$performance.ctr' },
        avgConversions: { $avg: '$performance.conversions' },
        totalListings: { $sum: 1 }
      }
    },
    { $sort: { avgCTR: -1 } },
    { $limit: 3 }
  ]);

  // Suggest packages based on user history
  const usedPackages = userListings.map(l => l.package?.name).filter(Boolean);
  const recommendedPackage = usedPackages.includes('enterprise')
    ? 'enterprise'
    : usedPackages.includes('premium')
    ? 'enterprise'
    : usedPackages.includes('basic')
    ? 'premium'
    : 'basic';

  res.json({
    success: true,
    recommendations: {
      suggestedPackage: recommendedPackage,
      topPlacements: topPlacements.map(p => ({
        placement: p._id,
        avgCTR: parseFloat((p.avgCTR || 0).toFixed(2)),
        reason: `${p.totalListings} active listings with good engagement`
      })),
      tips: [
        'Listings with images get 3x more clicks',
        'Homepage placements drive the most impressions',
        'Enterprise packages offer the best ROI for active brands'
      ]
    }
  });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// @desc    Get all featured listings (admin)
// @route   GET /api/featured/admin/all
// @access  Private/Admin
const adminGetAllListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;

  const query = {};
  if (status) query.status = status;
  if (type) query.targetType = type;

  const [listings, total] = await Promise.all([
    FeaturedListing.find(query)
      .populate('userId', 'fullName email')
      .populate('targetId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    FeaturedListing.countDocuments(query)
  ]);

  res.json({
    success: true,
    listings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Approve featured listing (admin)
// @route   POST /api/featured/admin/:id/approve
// @access  Private/Admin
const adminApproveListing = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  listing.status = 'active';
  listing.approvedBy = req.user._id;
  listing.approvedAt = new Date();
  listing.metadata = { ...listing.metadata, adminNotes: notes };

  await listing.save();

  await Notification.create({
    userId: listing.userId,
    type: 'system',
    title: 'Featured Listing Approved',
    message: `Your ${listing.targetType} featured listing has been approved and is now active.`,
    data: { featuredListingId: listing._id, url: `/featured/${listing._id}` }
  });

  res.json({ success: true, message: 'Featured listing approved', listing });
});

// @desc    Reject featured listing (admin)
// @route   POST /api/featured/admin/:id/reject
// @access  Private/Admin
const adminRejectListing = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Rejection reason is required');
  }

  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  listing.status = 'cancelled';
  listing.rejectionReason = reason;
  listing.cancelledBy = req.user._id;
  listing.cancellationReason = reason;

  await listing.save();

  if (listing.payment.status === 'paid' && listing.payment.amount > 0) {
    try {
      await stripe.refunds.create({ payment_intent: listing.payment.transactionId });
      listing.payment.status = 'refunded';
      listing.payment.refundedAt = new Date();
      await listing.save();
    } catch (error) {
      console.error('Refund error:', error.message);
    }
  }

  await Notification.create({
    userId: listing.userId,
    type: 'alert',
    title: 'Featured Listing Rejected',
    message: `Your featured listing was rejected. Reason: ${reason}`,
    priority: 'high',
    data: { featuredListingId: listing._id, url: `/featured/${listing._id}` }
  });

  res.json({ success: true, message: 'Featured listing rejected', listing });
});

// @desc    Get featured stats (admin)
// @route   GET /api/featured/admin/stats
// @access  Private/Admin
const adminGetStats = asyncHandler(async (req, res) => {
  const stats = FeaturedListing.getStats ? await FeaturedListing.getStats() : {};

  const revenueByMonth = await FeaturedListing.aggregate([
    { $match: { 'payment.status': 'paid', 'payment.paidAt': { $exists: true } } },
    {
      $group: {
        _id: { year: { $year: '$payment.paidAt' }, month: { $month: '$payment.paidAt' } },
        revenue: { $sum: '$package.price' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);

  const performanceByPlacement = await FeaturedListing.aggregate([
    { $match: { status: 'active', 'performance.impressions': { $gt: 0 } } },
    {
      $group: {
        _id: '$placement.type',
        totalImpressions: { $sum: '$performance.impressions' },
        totalClicks: { $sum: '$performance.clicks' },
        totalConversions: { $sum: '$performance.conversions' },
        avgCTR: { $avg: '$performance.ctr' }
      }
    }
  ]);

  res.json({
    success: true,
    stats: {
      ...stats,
      revenueByMonth: revenueByMonth.map(r => ({
        month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        revenue: r.revenue,
        count: r.count
      })),
      performanceByPlacement
    }
  });
});

// @desc    Update listing priority (admin)
// @route   PUT /api/featured/admin/:id/priority
// @access  Private/Admin
const adminUpdatePriority = asyncHandler(async (req, res) => {
  const { priority } = req.body;

  if (priority === undefined || priority < 1 || priority > 10) {
    res.status(400);
    throw new Error('Priority must be a number between 1 and 10');
  }

  const listing = await FeaturedListing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Featured listing not found');
  }

  listing.placement.priority = priority;
  listing.updatedAt = new Date();
  await listing.save();

  res.json({ success: true, message: 'Priority updated', listing });
});

// @desc    Bulk action on listings (admin)
// @route   POST /api/featured/admin/bulk
// @access  Private/Admin
const adminBulkAction = asyncHandler(async (req, res) => {
  const { listingIds, action, data } = req.body;

  if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
    res.status(400);
    throw new Error('listingIds array is required');
  }

  if (!action) {
    res.status(400);
    throw new Error('action is required');
  }

  const validActions = ['approve', 'reject', 'cancel', 'activate', 'pause', 'delete'];
  if (!validActions.includes(action)) {
    res.status(400);
    throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  const results = { success: [], failed: [] };

  await Promise.all(
    listingIds.map(async (id) => {
      try {
        const listing = await FeaturedListing.findById(id);
        if (!listing) {
          results.failed.push({ id, reason: 'Not found' });
          return;
        }

        switch (action) {
          case 'approve':
            listing.status = 'active';
            listing.approvedBy = req.user._id;
            listing.approvedAt = new Date();
            break;
          case 'reject':
            listing.status = 'cancelled';
            listing.cancellationReason = data?.reason || 'Bulk rejected by admin';
            listing.cancelledBy = req.user._id;
            break;
          case 'cancel':
            listing.status = 'cancelled';
            listing.cancellationReason = data?.reason || 'Bulk cancelled by admin';
            listing.cancelledBy = req.user._id;
            listing.cancelledAt = new Date();
            break;
          case 'activate':
            listing.status = 'active';
            break;
          case 'pause':
            listing.status = 'paused';
            break;
          case 'delete':
            await listing.deleteOne();
            results.success.push(id);
            return;
        }

        await listing.save();
        results.success.push(id);
      } catch (err) {
        results.failed.push({ id, reason: err.message });
      }
    })
  );

  res.json({
    success: true,
    message: `Bulk ${action} completed`,
    results: {
      total: listingIds.length,
      succeeded: results.success.length,
      failed: results.failed.length,
      failedDetails: results.failed
    }
  });
});

// ============================================================
// MODULE EXPORTS — every function imported in featuredRoutes.js
// ============================================================
module.exports = {
  // Public
  getFeaturedListings,
  getListingsByPlacement,
  getPackages,
  calculatePrice,
  getAvailability,

  // Tracking
  trackImpression,
  trackClick,
  trackConversion,

  // Protected user
  createFeaturedListing,
  getMyListings,
  getFeaturedListing,
  updateFeaturedListing,
  cancelFeaturedListing,
  extendFeaturedListing,
  confirmExtension,
  getPerformanceStats,
  getRecommendations,

  // Admin
  adminGetAllListings,
  adminApproveListing,
  adminRejectListing,
  adminGetStats,
  adminUpdatePriority,
  adminBulkAction
};