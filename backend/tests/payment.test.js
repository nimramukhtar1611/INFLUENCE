const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M7 Payments & Escrow', () => {
  test('payment files exist', () => {
    expectFileExists('controllers/paymentController.js');
    expectFileExists('routes/paymentRoutes.js');
  });

  test('payment handlers are present', () => {
    expectFileContainsAll('controllers/paymentController.js', [
      'exports.createEscrow',
      'exports.releasePayment',
      'exports.handleStripeWebhook'
    ]);
  });
});
