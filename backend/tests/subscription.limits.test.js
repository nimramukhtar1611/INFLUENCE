const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('Subscription Limits Enforcement', () => {
  test('backend limit enforcement snippets exist', () => {
    expectFileExists('controllers/subscriptionController.js');
    expectFileExists('controllers/dealController.js');
    expectFileExists('controllers/campaignController.js');

    expectFileContainsAll('controllers/subscriptionController.js', [
      'const ACTIVE_DEAL_STATUSES =',
      'campaignsUsed: isBrand ? brandCampaignsUsed : 0',
      'createCampaign: !isBrand || !isLimitReached(limits.campaigns, usage.campaignsUsed)',
      'createDeal: !isBrand || !isLimitReached(limits.activeDeals, usage.activeDealsUsed)',
      'completedDeals: isCreator ? 2 : -1',
      'completedDealsUsed: isCreator ? creatorCompletedDeals : 0',
      'acceptDeals: canAcceptDeals',
      'applyDeals: canAcceptDeals'
    ]);

    expectFileContainsAll('controllers/dealController.js', [
      'const getCreatorCompletedDealsLimitByPlan = (planId = \'free\') => {',
      'const getCreatorCompletedDealsGuard = async (creatorId) => {',
      'exports.acceptDeal = catchAsync(async (req, res) => {',
      'exports.updateDealStatus = catchAsync(async (req, res) => {',
      'code: \'CREATOR_DEAL_LIMIT_REACHED\''
    ]);

    expectFileContainsAll('controllers/campaignController.js', [
      'const getCreatorCompletedDealsLimitByPlan = (planId = \'free\') => {',
      'exports.applyToCampaign = async (req, res) => {',
      'code: \'CREATOR_DEAL_LIMIT_REACHED\''
    ]);
  });

  test('creator and brand subscription limits are exposed by limits endpoint', () => {
    expectFileContainsAll('controllers/subscriptionController.js', [
      'const checkLimits = asyncHandler(async (req, res) => {',
      'const isCreator = req.user.userType === \'creator\';',
      'const isBrand = req.user.userType === \'brand\';',
      'brandCampaignsUsed',
      'creatorCompletedDeals',
      'acceptDeals: canAcceptDeals',
      'applyDeals: canAcceptDeals'
    ]);
  });

  test('subscription page renders role-specific usage and infinite labels', () => {
    expectFileExists('..\\frontend\\src\\pages\\Common\\SubscriptionManager.jsx');

    expectFileContainsAll('..\\frontend\\src\\pages\\Common\\SubscriptionManager.jsx', [
      'const formatLimitValue = (value) => {',
      "if (numeric === -1) return 'Infinite';",
      "{user?.userType === 'brand' && (",
      "{user?.userType === 'creator' && (",
      "<p className=\"text-gray-500\">Completed Deals</p>",
      'Completed deals cap: 30 total',
      'Completed deals cap: Infinite'
    ]);
  });
});
