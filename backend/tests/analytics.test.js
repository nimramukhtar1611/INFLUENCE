const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M9 Analytics', () => {
  test('analytics files exist', () => {
    expectFileExists('controllers/analyticsController.js');
    expectFileExists('routes/analyticsRoutes.js');
    expectFileExists('routes/reportRoutes.js');
  });

  test('analytics handlers are present', () => {
    expectFileContainsAll('controllers/analyticsController.js', [
      'getDashboardAnalytics',
      'getFinancialAnalytics',
      'createReport'
    ]);
  });
});