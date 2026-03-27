const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const toNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const featureFlags = {
  fraudDetection: {
    enabled: toBoolean(process.env.FRAUD_DETECTION_ENABLED, false),
    autoScoreOnSocialSync: toBoolean(process.env.FRAUD_DETECTION_AUTOSCORE_ON_SYNC, true),
    enforcementEnabled: toBoolean(process.env.FRAUD_DETECTION_ENFORCEMENT, false),
    minFollowersForScoring: toNumber(process.env.FRAUD_DETECTION_MIN_FOLLOWERS, 1000),
    maxHistoryEntries: toNumber(process.env.FRAUD_DETECTION_MAX_HISTORY, 200)
  }
};

module.exports = {
  featureFlags,
  toBoolean,
  toNumber
};
