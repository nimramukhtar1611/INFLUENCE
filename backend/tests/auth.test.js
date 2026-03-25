const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M1 Auth & Security', () => {
  test('auth and 2fa files exist', () => {
    expectFileExists('controllers/authController.js');
    expectFileExists('routes/authRoutes.js');
    expectFileExists('routes/twoFARoutes.js');
    expectFileExists('routes/adminTwoFARoutes.js');
  });

  test('auth flow handlers are present', () => {
    expectFileContainsAll('controllers/authController.js', [
      'exports.register',
      'exports.login',
      'exports.refreshToken',
      'exports.changePassword'
    ]);
  });
});
