const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M6 Delivery & Approval', () => {
  test('deliverable files exist', () => {
    expectFileExists('controllers/deliverableController.js');
    expectFileExists('routes/deliverableRoutes.js');
  });

  test('deliverable handlers are present', () => {
    expectFileContainsAll('controllers/deliverableController.js', [
      'submitDeliverable',
      'approveDeliverable',
      'requestDeliverableRevision'
    ]);
  });
});
