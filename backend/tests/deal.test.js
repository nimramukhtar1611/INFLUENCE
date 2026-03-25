const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M5 Deals & Contracts', () => {
  test('deal and contract files exist', () => {
    expectFileExists('controllers/dealController.js');
    expectFileExists('routes/dealRoutes.js');
    expectFileExists('routes/contractRoutes.js');
  });

  test('deal handlers are present', () => {
    expectFileContainsAll('controllers/dealController.js', [
      'exports.createDeal',
      'exports.acceptDeal',
      'exports.completeDeal'
    ]);
  });
});
