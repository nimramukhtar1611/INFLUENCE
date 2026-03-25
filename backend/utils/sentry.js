let sentryClient = null;
let sentryEnabled = false;

const initializeSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
    });

    sentryClient = Sentry;
    sentryEnabled = true;
    console.log('✅ Sentry initialized');
    return true;
  } catch (error) {
    sentryEnabled = false;
    console.warn('⚠️ Sentry initialization skipped:', error.message);
    return false;
  }
};

const captureException = (error, context = {}) => {
  if (!sentryEnabled || !sentryClient || !error) {
    return;
  }

  sentryClient.withScope((scope) => {
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, String(value));
      });
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    sentryClient.captureException(error);
  });
};

module.exports = {
  initializeSentry,
  captureException
};
