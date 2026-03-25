// controllers/reviewController.js - COMPLETE FIXED VERSION
const Review = require('../models/Review');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
  const { dealId, rating, title, content, pros, cons, criteria } = req.body;

  // Validation
  if (!dealId || !rating || !content) {
    res.status(400);
    throw new Error('Deal ID, rating, and content are required');
  }

  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if deal exists and is completed
  const deal = await Deal.findById(dealId);
  if (!deal) {
    res.status(404);
    throw new Error('Deal not found');
  }

  if (deal.status !== 'completed') {
    res.status(400);
    throw new Error('Can only review completed deals');
  }

  // Check if user is part of the deal
  if (deal.brandId.toString() !== req.user._id.toString() && 
      deal.creatorId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to review this deal');
  }

  // PREVENT DUPLICATE REVIEW
  const existingReview = await Review.findOne({ dealId });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this deal');
  }

  // Determine review direction
  const fromUser = req.user._id;
  const toUser = req.user._id.toString() === deal.brandId.toString() 
    ? deal.creatorId 
    : deal.brandId;
  
  const fromUserType = req.user.userType;
  const toUserType = fromUserType === 'brand' ? 'creator' : 'brand';

  // Check if the reviewee has already reviewed (prevent double reviews)
  const oppositeReview = await Review.findOne({
    dealId,
    fromUser: toUser,
    toUser: fromUser
  });

  // Create review
  const review = await Review.create({
    dealId,
    campaignId: deal.campaignId,
    fromUser,
    fromUserType,
    toUser,
    toUserType,
    rating,
    title: title || '',
    content,
    pros: pros || [],
    cons: cons || [],
    criteria: criteria || {},
    isPublic: true,
    isVerified: true
  });

  // Update user stats
  const toUserDoc = await User.findById(toUser);
  if (toUserDoc) {
    // Get all reviews for this user
    const userReviews = await Review.find({ toUser, isPublic: true });
    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
    
    if (toUserType === 'brand') {
      await User.findByIdAndUpdate(toUser, {
        'stats.averageRating': avgRating,
        'stats.totalReviews': userReviews.length
      });
    } else {
      await User.findByIdAndUpdate(toUser, {
        'stats.averageRating': avgRating,
        'stats.totalReviews': userReviews.length
      });
    }
  }

  // Notify the reviewee
  await Notification.create({
    userId: toUser,
    type: 'system',
    title: 'New Review',
    message: `${req.user.fullName} left you a ${rating}-star review`,
    data: {
      reviewId: review._id,
      dealId: deal._id,
      url: `/reviews/${review._id}`
    }
  });

  // If both parties have reviewed, create a combined review
  if (oppositeReview) {
    // You could trigger some combined rating logic here
    console.log(`Both parties have reviewed deal ${dealId}`);
  }

  res.status(201).json({
    success: true,
    review
  });
});

// @desc    Get reviews for user
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const [reviews, total] = await Promise.all([
    Review.find({ toUser: req.params.userId, isPublic: true })
      .populate('fromUser', 'fullName profilePicture userType')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Review.countDocuments({ toUser: req.params.userId, isPublic: true })
  ]);

  // Calculate average rating
  const allReviews = await Review.find({ toUser: req.params.userId, isPublic: true });
  const averageRating = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : 0;

  // Calculate rating distribution
  const distribution = {
    1: allReviews.filter(r => r.rating === 1).length,
    2: allReviews.filter(r => r.rating === 2).length,
    3: allReviews.filter(r => r.rating === 3).length,
    4: allReviews.filter(r => r.rating === 4).length,
    5: allReviews.filter(r => r.rating === 5).length
  };

  res.json({
    success: true,
    reviews,
    averageRating,
    totalReviews: total,
    distribution,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// @desc    Get review for deal
// @route   GET /api/reviews/deal/:dealId
// @access  Private
const getDealReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ dealId: req.params.dealId })
    .populate('fromUser', 'fullName profilePicture userType')
    .populate('toUser', 'fullName profilePicture userType');

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if user is part of the deal
  if (review.fromUser._id.toString() !== req.user._id.toString() &&
      review.toUser._id.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({
    success: true,
    review
  });
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.fromUser.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Can only update within 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (review.createdAt < thirtyDaysAgo) {
    res.status(400);
    throw new Error('Cannot update reviews older than 30 days');
  }

  const { rating, title, content, pros, cons, criteria } = req.body;

  if (rating) {
    if (rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating must be between 1 and 5');
    }
    review.rating = rating;
  }
  
  if (title !== undefined) review.title = title;
  if (content !== undefined) review.content = content;
  if (pros !== undefined) review.pros = pros;
  if (cons !== undefined) review.cons = cons;
  if (criteria !== undefined) review.criteria = { ...review.criteria, ...criteria };

  review.updatedAt = new Date();
  await review.save();

  // Update user stats
  const userReviews = await Review.find({ toUser: review.toUser, isPublic: true });
  const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
  
  await User.findByIdAndUpdate(review.toUser, {
    'stats.averageRating': avgRating
  });

  res.json({
    success: true,
    review
  });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.fromUser.toString() !== req.user._id.toString() && req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  const toUser = review.toUser;
  await review.deleteOne();

  // Update user stats
  const userReviews = await Review.find({ toUser, isPublic: true });
  const avgRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 0;
  
  await User.findByIdAndUpdate(toUser, {
    'stats.averageRating': avgRating,
    'stats.totalReviews': userReviews.length
  });

  res.json({
    success: true,
    message: 'Review deleted'
  });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Toggle helpful
  const alreadyHelpful = review.helpful.includes(req.user._id);
  
  if (alreadyHelpful) {
    review.helpful = review.helpful.filter(id => id.toString() !== req.user._id.toString());
  } else {
    review.helpful.push(req.user._id);
  }

  await review.save();

  res.json({
    success: true,
    helpful: review.helpful.length,
    isHelpful: !alreadyHelpful
  });
});

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Reason is required');
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if already reported by this user
  const alreadyReported = review.reported.some(
    r => r.userId.toString() === req.user._id.toString()
  );

  if (alreadyReported) {
    res.status(400);
    throw new Error('You have already reported this review');
  }

  review.reported.push({
    userId: req.user._id,
    reason,
    date: new Date()
  });

  // Auto-hide if multiple reports
  if (review.reported.length >= 3) {
    review.isPublic = false;
  }

  await review.save();

  // Notify admins if multiple reports
  if (review.reported.length >= 2) {
    const admins = await User.find({ userType: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'alert',
        title: 'Review Reported Multiple Times',
        message: `Review for deal ${review.dealId} has been reported ${review.reported.length} times`,
        data: { reviewId: review._id }
      });
    }
  }

  res.json({
    success: true,
    message: 'Review reported'
  });
});

// @desc    Respond to review (for the reviewee)
// @route   POST /api/reviews/:id/respond
// @access  Private
const respondToReview = asyncHandler(async (req, res) => {
  const { response } = req.body;

  if (!response) {
    res.status(400);
    throw new Error('Response is required');
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Only the reviewee can respond
  if (review.toUser.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Can't respond to your own review
  if (review.fromUser.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot respond to your own review');
  }

  review.adminResponse = {
    content: response,
    respondedBy: req.user._id,
    respondedAt: new Date()
  };

  await review.save();

  // Notify the reviewer
  await Notification.create({
    userId: review.fromUser,
    type: 'system',
    title: 'Response to Your Review',
    message: `${req.user.fullName} responded to your review`,
    data: { reviewId: review._id }
  });

  res.json({
    success: true,
    review
  });
});

// @desc    Get reviews summary for user
// @route   GET /api/reviews/user/:userId/summary
// @access  Public
const getUserReviewSummary = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  const [reviews, total] = await Promise.all([
    Review.find({ toUser: userId, isPublic: true })
      .select('rating createdAt')
      .lean(),
    Review.countDocuments({ toUser: userId, isPublic: true })
  ]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const distribution = {
    1: reviews.filter(r => r.rating === 1).length,
    2: reviews.filter(r => r.rating === 2).length,
    3: reviews.filter(r => r.rating === 3).length,
    4: reviews.filter(r => r.rating === 4).length,
    5: reviews.filter(r => r.rating === 5).length
  };

  // Recent trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentReviews = reviews.filter(r => new Date(r.createdAt) > thirtyDaysAgo);
  const recentAverage = recentReviews.length > 0
    ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
    : 0;

  res.json({
    success: true,
    summary: {
      totalReviews: total,
      averageRating,
      distribution,
      recentAverage,
      recentCount: recentReviews.length
    }
  });
});

module.exports = {
  createReview,
  getUserReviews,
  getDealReview,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  respondToReview,
  getUserReviewSummary
};