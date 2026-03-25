// server/controllers/ratingController.js
const Rating = require('../models/Rating');
const Deal = require('../models/Deal');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create Rating
// @route   POST /api/ratings
// @access  Private
exports.createRating = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deal_id, to_user_id, scores, review_text, pros, cons, tags } = req.body;

    // Check if deal exists and is completed
    const deal = await Deal.findById(deal_id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    if (deal.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed deals'
      });
    }

    // Check if user is part of the deal
    const isBrand = deal.brand_id.toString() === req.user.id;
    const isCreator = deal.creator_id.toString() === req.user.id;

    if (!isBrand && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this deal'
      });
    }

    // Determine rating type
    const ratingType = isBrand ? 'brand_to_creator' : 'creator_to_brand';
    const fromUserId = req.user.id;
    const toUserId = to_user_id || (isBrand ? deal.creator_id : deal.brand_id);

    // Check if already rated
    const existingRating = await Rating.findOne({
      deal_id,
      'from_user.user_id': fromUserId,
      rating_type: ratingType
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this deal'
      });
    }

    // Create rating
    const rating = new Rating({
      deal_id,
      from_user: {
        user_id: fromUserId,
        user_type: isBrand ? 'brand' : 'creator'
      },
      to_user: {
        user_id: toUserId,
        user_type: isBrand ? 'creator' : 'brand'
      },
      rating_type: ratingType,
      scores,
      review_text,
      pros,
      cons,
      tags,
      status: 'pending' // Needs moderation
    });

    await rating.save();

    // Update user's average rating
    await updateUserRating(toUserId);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully. It will be published after review.',
      data: rating
    });

  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Ratings for User
// @route   GET /api/ratings/user/:userId
// @access  Public
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, type } = req.query;

    const query = {
      'to_user.user_id': userId,
      status: 'published'
    };

    if (type) {
      query.rating_type = type === 'brand' ? 'brand_to_creator' : 'creator_to_brand';
    }

    const ratings = await Rating.find(query)
      .populate('from_user.user_id', 'full_name profile_image')
      .populate('deal_id')
      .sort('-created_at')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments(query);

    // Get rating statistics
    const stats = await Rating.getUserRatings(userId, type);

    res.json({
      success: true,
      data: {
        ratings,
        stats: stats[0] || {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: []
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_ratings: total
        }
      }
    });

  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Rating by ID
// @route   GET /api/ratings/:ratingId
// @access  Public
exports.getRatingById = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId)
      .populate('from_user.user_id', 'full_name profile_image')
      .populate('to_user.user_id', 'full_name profile_image')
      .populate('deal_id');

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if rating is published or user is involved
    if (rating.status !== 'published' && 
        rating.from_user.user_id._id.toString() !== req.user?.id &&
        rating.to_user.user_id._id.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Rating not available'
      });
    }

    res.json({
      success: true,
      data: rating
    });

  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update Rating
// @route   PUT /api/ratings/:ratingId
// @access  Private
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const updates = req.body;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if user owns this rating
    if (rating.from_user.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this rating'
      });
    }

    // Check if rating can be edited (within 48 hours)
    const hoursSinceCreation = (Date.now() - rating.created_at) / (1000 * 60 * 60);
    if (hoursSinceCreation > 48) {
      return res.status(400).json({
        success: false,
        message: 'Rating can only be edited within 48 hours'
      });
    }

    // Update fields
    if (updates.scores) rating.scores = updates.scores;
    if (updates.review_text) rating.review_text = updates.review_text;
    if (updates.pros) rating.pros = updates.pros;
    if (updates.cons) rating.cons = updates.cons;
    if (updates.tags) rating.tags = updates.tags;

    rating.is_edited = true;
    rating.edit_history.push({
      content: updates,
      edited_at: new Date()
    });

    await rating.save();

    // Update user's average rating
    await updateUserRating(rating.to_user.user_id);

    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: rating
    });

  } catch (error) {
    console.error('Update rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark Rating as Helpful
// @route   POST /api/ratings/:ratingId/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    await rating.markHelpful(req.user.id);

    res.json({
      success: true,
      message: 'Marked as helpful'
    });

  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Report Rating
// @route   POST /api/ratings/:ratingId/report
// @access  Private
exports.reportRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { reason } = req.body;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    await rating.report(req.user.id, reason);

    res.json({
      success: true,
      message: 'Rating reported. Thank you for your feedback.'
    });

  } catch (error) {
    console.error('Report rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add Response to Rating
// @route   POST /api/ratings/:ratingId/respond
// @access  Private
exports.addResponse = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { text } = req.body;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if user is the recipient of the rating
    if (rating.to_user.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can respond to this rating'
      });
    }

    // Check if response already exists
    if (rating.response && rating.response.text) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this rating'
      });
    }

    await rating.addResponse(text, req.user.id);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: rating
    });

  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Recent Ratings
// @route   GET /api/ratings/recent
// @access  Public
exports.getRecentRatings = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const ratings = await Rating.find({ status: 'published' })
      .populate('from_user.user_id', 'full_name profile_image')
      .populate('to_user.user_id', 'full_name profile_image')
      .populate('deal_id')
      .sort('-created_at')
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: ratings
    });

  } catch (error) {
    console.error('Get recent ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Admin: Get Pending Ratings
// @route   GET /api/admin/ratings/pending
// @access  Private (Admin)
exports.getPendingRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ status: 'pending' })
      .populate('from_user.user_id', 'full_name email')
      .populate('to_user.user_id', 'full_name email')
      .populate('deal_id')
      .sort('-created_at');

    res.json({
      success: true,
      data: ratings
    });

  } catch (error) {
    console.error('Get pending ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Admin: Moderate Rating
// @route   PUT /api/admin/ratings/:ratingId/moderate
// @access  Private (Admin)
exports.moderateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { action, notes } = req.body;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    let newStatus;
    switch(action) {
      case 'approve':
        newStatus = 'published';
        break;
      case 'reject':
        newStatus = 'removed';
        break;
      case 'flag':
        newStatus = 'flagged';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    rating.status = newStatus;
    rating.moderation = {
      reviewed_by: req.admin._id,
      reviewed_at: new Date(),
      moderation_notes: notes,
      action_taken: action
    };

    await rating.save();

    // If approved, update user's rating
    if (newStatus === 'published') {
      await updateUserRating(rating.to_user.user_id);
    }

    res.json({
      success: true,
      message: `Rating ${action}ed successfully`,
      data: rating
    });

  } catch (error) {
    console.error('Moderate rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper Functions
async function updateUserRating(userId) {
  const stats = await Rating.getUserRatings(userId);
  
  if (stats.length > 0) {
    const averageRating = stats[0].average_rating;
    
    await User.findByIdAndUpdate(userId, {
      'creator_profile.average_rating': averageRating,
      'creator_profile.total_ratings': stats[0].total_ratings
    });
  }
}

module.exports = exports;