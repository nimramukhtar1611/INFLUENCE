const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M2 Onboarding & Profile', () => {
  test('profile-related files exist', () => {
    expectFileExists('controllers/userController.js');
    expectFileExists('routes/userRoutes.js');
    expectFileExists('routes/brandRoutes.js');
    expectFileExists('routes/creatorRoutes.js');
  });

  test('profile handlers are present', () => {
    expectFileContainsAll('controllers/userController.js', [
      'getUsers',
      'getUser',
      'updateUser',
      'getUserStats'
    ]);
  });
});
