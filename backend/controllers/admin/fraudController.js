const Creator = require('../../models/Creator');

exports.getFraudReviewQueue = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const queue = String(req.query.queue || 'manual_review').toLowerCase();
    const riskLevel = req.query.riskLevel ? String(req.query.riskLevel).toLowerCase() : null;

    const filter = {};

    if (queue === 'manual_review') {
      filter['fraudDetection.manualReviewRequired'] = true;
    } else if (queue === 'high_risk') {
      filter['fraudDetection.riskLevel'] = 'high';
    } else if (queue === 'all_flagged') {
      filter.$or = [
        { 'fraudDetection.manualReviewRequired': true },
        { 'fraudDetection.riskLevel': 'high' }
      ];
    }

    if (riskLevel && ['low', 'medium', 'high'].includes(riskLevel)) {
      filter['fraudDetection.riskLevel'] = riskLevel;
    }

    const [total, creators] = await Promise.all([
      Creator.countDocuments(filter),
      Creator.find(filter)
        .select('displayName handle totalFollowers averageEngagement lastSocialSync fraudDetection updatedAt')
        .sort({
          'fraudDetection.manualReviewRequired': -1,
          'fraudDetection.riskScore': -1,
          updatedAt: -1
        })
        .skip(skip)
        .limit(limit)
    ]);

    res.json({
      success: true,
      queue,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      creators
    });
  } catch (error) {
    console.error('Get fraud review queue error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load fraud review queue' });
  }
};

exports.getCreatorFraudDetails = async (req, res) => {
  try {
    const { creatorId } = req.params;

    const creator = await Creator.findById(creatorId)
      .select('displayName handle bio totalFollowers averageEngagement socialMedia lastSocialSync fraudDetection');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    res.json({
      success: true,
      creator
    });
  } catch (error) {
    console.error('Get creator fraud details error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load creator fraud details' });
  }
};

exports.updateFraudReviewStatus = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const action = String(req.body.action || '').toLowerCase();
    const notes = req.body.notes ? String(req.body.notes).trim() : '';

    if (!['clear_hold', 'mark_manual_review'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Allowed actions: clear_hold, mark_manual_review'
      });
    }

    const update = {};

    if (action === 'clear_hold') {
      update['fraudDetection.manualReviewRequired'] = false;
      update['fraudDetection.reviewedAt'] = new Date();
      update['fraudDetection.reviewedBy'] = req.user?._id || null;
      update['fraudDetection.reviewNotes'] = notes;
    }

    if (action === 'mark_manual_review') {
      update['fraudDetection.manualReviewRequired'] = true;
      update['fraudDetection.holdAppliedAt'] = new Date();
      update['fraudDetection.reviewedAt'] = null;
      update['fraudDetection.reviewedBy'] = null;
      update['fraudDetection.reviewNotes'] = notes;
    }

    const creator = await Creator.findByIdAndUpdate(
      creatorId,
      { $set: update },
      { new: true }
    ).select('displayName handle totalFollowers averageEngagement fraudDetection updatedAt');

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    res.json({
      success: true,
      message: action === 'clear_hold' ? 'Fraud hold cleared' : 'Creator marked for manual review',
      creator
    });
  } catch (error) {
    console.error('Update fraud review status error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update fraud review status' });
  }
};
