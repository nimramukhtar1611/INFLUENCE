const { expectFileExists, expectFileContainsAll } = require('../utils/moduleTestUtils');

describe('Security Penetration Smoke Coverage', () => {
  test('security middleware is present in server bootstrap', () => {
    expectFileContainsAll('server.js', [
      'helmet',
      'cors',
      'app.use(helmet',
      'app.use(cors'
    ]);
  });

  test('runtime error monitoring captures exceptions', () => {
    expectFileExists('utils/sentry.js');
    expectFileContainsAll('server.js', [
      'initializeSentry',
      'captureException(err'
    ]);
  });

  test('sensitive auth protections exist', () => {
    expectFileExists('middleware/security.js');
    expectFileExists('middleware/rateLimiter.js');
    expectFileExists('middleware/captcha.js');
  });
});
