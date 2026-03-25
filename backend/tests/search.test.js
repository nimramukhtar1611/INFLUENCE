const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M4 Search & Match', () => {
  test('search files exist', () => {
    expectFileExists('controllers/searchController.js');
    expectFileExists('routes/searchRoutes.js');
  });

  test('search handlers are present', () => {
    expectFileContainsAll('controllers/searchController.js', [
      'searchCreators',
      'searchCampaigns',
      'getRecommendations'
    ]);
  });
});
