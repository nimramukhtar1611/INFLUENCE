const { expectFileExists, expectFileContainsAll } = require('../utils/moduleTestUtils');

describe('API Contract Coverage', () => {
  test('payment gateway contract endpoints are defined', () => {
    expectFileExists('routes/paymentRoutes.js');
    expectFileContainsAll('routes/paymentRoutes.js', [
      '/escrow/checkout-intent',
      '/escrow/:paymentId/confirm'
    ]);
  });

  test('social OAuth contract routes are mounted on server', () => {
    expectFileExists('routes/socialOAuthRoutes.js');
    expectFileContainsAll('server.js', [
      "const socialOAuthRoutes = require('./routes/socialOAuthRoutes');",
      "app.use('/api/social-oauth', socialOAuthRoutes);"
    ]);
  });

  test('subscription contract supports interval-aware Stripe price resolution', () => {
    expectFileContainsAll('controllers/subscriptionController.js', [
      'resolveStripePriceId',
      'missing Stripe price for plan'
    ]);
  });
});
