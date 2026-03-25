const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');
const Campaign = require('../models/Campaign'); // Make sure this import exists
const { checkOwnership } = require('../middleware/ownership');

router.put('/:id', protect, authorize('brand'), checkOwnership(Campaign, 'brandId'), campaignController.updateCampaign);
// ==================== PUBLIC ROUTES ====================
// Get available campaigns for creators
router.get('/available', protect, authorize('creator'), campaignController.getAvailableCampaigns);

// ==================== PROTECTED ROUTES ====================
router.use(protect); // All routes below require authentication

// -------------------- BRAND ROUTES --------------------

// Create a campaign
router.post('/', authorize('brand'), campaignController.createCampaign);

// Middleware to check if the campaign belongs to the brand
async function checkBrandOwnership(req, res, next) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  if (campaign.brandId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  req.campaign = campaign; // attach campaign for controller use
  next();
}

// Update a campaign
router.put('/:id', authorize('brand'), checkBrandOwnership, campaignController.updateCampaign);

// Get campaigns created by the brand
router.get('/brand', authorize('brand'), campaignController.getBrandCampaigns);

// Delete a campaign
router.delete('/:id', authorize('brand'), checkBrandOwnership, campaignController.deleteCampaign);

// Publish, pause, complete, archive, duplicate campaigns
router.post('/:id/publish', authorize('brand'), checkBrandOwnership, campaignController.publishCampaign);
router.post('/:id/pause', authorize('brand'), checkBrandOwnership, campaignController.pauseCampaign);
router.post('/:id/complete', authorize('brand'), checkBrandOwnership, campaignController.completeCampaign);
router.post('/:id/archive', authorize('brand'), checkBrandOwnership, campaignController.archiveCampaign);
router.post('/:id/duplicate', authorize('brand'), checkBrandOwnership, campaignController.duplicateCampaign);

// Invite creators
router.post('/:id/invite', authorize('brand'), checkBrandOwnership, campaignController.inviteCreator);

// Review applications
router.put('/:campaignId/applications/:applicationId', authorize('brand'), campaignController.reviewApplication);

// Campaign analytics
router.get('/:id/analytics', authorize('brand'), checkBrandOwnership, campaignController.getCampaignAnalytics);

// -------------------- CREATOR ROUTES --------------------

// Get campaigns applied/assigned to the creator
router.get('/creator', authorize('creator'), campaignController.getCreatorCampaigns);

// Apply to a campaign
router.post('/:id/apply', authorize('creator'), campaignController.applyToCampaign);

// -------------------- SHARED ROUTES --------------------

// Get a campaign by ID (public within protected routes)
router.get('/:id', campaignController.getCampaign);

module.exports = router;