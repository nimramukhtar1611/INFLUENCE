const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M3 Campaign Builder', () => {
  test('campaign files exist', () => {
    expectFileExists('controllers/campaignController.js');
    expectFileExists('routes/campaignRoutes.js');
  });

  test('campaign handlers are present', () => {
    expectFileContainsAll('controllers/campaignController.js', [
      'exports.createCampaign',
      'exports.getBrandCampaigns',
      'exports.getCampaignAnalytics'
    ]);
  });
});
