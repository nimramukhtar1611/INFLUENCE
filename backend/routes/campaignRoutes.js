const express = require('express');
const router = express.Router();
const { protect, authorize, hasPermission, resolveBrandContext } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');
const Campaign = require('../models/Campaign');

// ==================== PUBLIC ROUTES ====================
// Get available campaigns for creators
router.get('/available', protect, authorize('creator'), campaignController.getAvailableCampaigns);

// ==================== PROTECTED ROUTES ====================
router.use(protect, resolveBrandContext); // All routes below require authentication

// -------------------- BRAND ROUTES --------------------

// Create a campaign
router.post('/', authorize('brand'), hasPermission('create_campaigns'), campaignController.createCampaign);

// Middleware to check if the campaign belongs to the brand
async function checkBrandOwnership(req, res, next) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  const activeBrandId = (req.brandId || req.user._id).toString();
  if (campaign.brandId.toString() !== activeBrandId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  req.campaign = campaign; // attach campaign for controller use
  next();
}

// Update a campaign
router.put('/:id', authorize('brand'), hasPermission('edit_campaigns'), checkBrandOwnership, campaignController.updateCampaign);

// Get campaigns created by the brand
router.get('/brand', authorize('brand'), hasPermission('view_campaigns'), campaignController.getBrandCampaigns);

// Delete a campaign
router.delete('/:id', authorize('brand'), hasPermission('delete_campaigns'), checkBrandOwnership, campaignController.deleteCampaign);

// Publish, pause, complete, archive, duplicate campaigns
router.post('/:id/publish', authorize('brand'), hasPermission('edit_campaigns'), checkBrandOwnership, campaignController.publishCampaign);
router.post('/:id/pause', authorize('brand'), hasPermission('edit_campaigns'), checkBrandOwnership, campaignController.pauseCampaign);
router.post('/:id/complete', authorize('brand'), hasPermission('edit_campaigns'), checkBrandOwnership, campaignController.completeCampaign);
router.post('/:id/archive', authorize('brand'), hasPermission('edit_campaigns'), checkBrandOwnership, campaignController.archiveCampaign);
router.post('/:id/duplicate', authorize('brand'), hasPermission('create_campaigns'), checkBrandOwnership, campaignController.duplicateCampaign);

// Invite creators
router.post('/:id/invite', authorize('brand'), hasPermission('invite_creators'), checkBrandOwnership, campaignController.inviteCreator);

// Review applications
router.put('/:campaignId/applications/:applicationId', authorize('brand'), hasPermission('edit_campaigns'), campaignController.reviewApplication);

// Campaign analytics
router.get('/:id/analytics', authorize('brand'), hasPermission('view_analytics'), checkBrandOwnership, campaignController.getCampaignAnalytics);

// -------------------- CREATOR ROUTES --------------------

// Get campaigns applied/assigned to the creator
router.get('/creator', authorize('creator'), campaignController.getCreatorCampaigns);

// Apply to a campaign
router.post('/:id/apply', authorize('creator'), campaignController.applyToCampaign);

// -------------------- SHARED ROUTES --------------------

// Get a campaign by ID (public within protected routes)
router.get('/:id', campaignController.getCampaign);

module.exports = router;