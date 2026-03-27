const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { adminProtect } = require('../middleware/auth');
const campaignController = require('../controllers/admin/campaignController');

router.use(adminProtect);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  campaignController.getCampaigns
);

router.get('/stats', campaignController.getCampaignStats);
router.get('/pending', campaignController.getPendingCampaigns);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid campaign ID')],
  campaignController.getCampaign
);

router.put(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid campaign ID'),
    body('status').notEmpty().withMessage('Status is required')
  ],
  campaignController.updateCampaignStatus
);

router.post(
  '/:id/feature',
  [param('id').isMongoId().withMessage('Invalid campaign ID')],
  campaignController.featureCampaign
);

router.delete(
  '/:id/feature',
  [param('id').isMongoId().withMessage('Invalid campaign ID')],
  campaignController.unfeatureCampaign
);

router.put('/bulk', campaignController.bulkUpdateCampaigns);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid campaign ID')],
  campaignController.deleteCampaign
);

module.exports = router;
