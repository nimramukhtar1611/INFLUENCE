const { expectFileExists, expectFileContainsAll } = require('./utils/moduleTestUtils');

describe('M8 Notifications', () => {
  test('notification files exist', () => {
    expectFileExists('controllers/notificationController.js');
    expectFileExists('routes/notificationRoutes.js');
    expectFileExists('routes/pushRoutes.js');
  });

  test('notification handlers are present', () => {
    expectFileContainsAll('controllers/notificationController.js', [
      'getNotifications',
      'markAsRead',
      'updatePreferences'
    ]);
  });
});
