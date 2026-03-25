// utils/twoFASessionStore.js
// ✅ Shared in-memory session store — circular dependency se bacha ke

const twoFASessionStore = new Map();
const twoFAAttemptStore = new Map();

const SESSION_TTL = 5 * 60 * 1000;   // 5 minutes
const ATTEMPT_TTL = 15 * 60 * 1000;  // 15 minutes
const MAX_ATTEMPTS = 6;

const setTwoFASession = (userId) => {
  twoFASessionStore.set(String(userId), {
    userId: String(userId),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL
  });
};

const getTwoFASession = (userId) => {
  const session = twoFASessionStore.get(String(userId));
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    twoFASessionStore.delete(String(userId));
    return null;
  }
  return session;
};

const deleteTwoFASession = (userId) => {
  twoFASessionStore.delete(String(userId));
};

const getAttempts = (userId) => {
  const record = twoFAAttemptStore.get(String(userId));
  if (!record) return 0;
  if (Date.now() - record.firstAttempt > ATTEMPT_TTL) {
    twoFAAttemptStore.delete(String(userId));
    return 0;
  }
  return record.count;
};

const incrementAttempts = (userId) => {
  const key = String(userId);
  const record = twoFAAttemptStore.get(key);
  const now = Date.now();
  if (!record || now - record.firstAttempt > ATTEMPT_TTL) {
    twoFAAttemptStore.set(key, { count: 1, firstAttempt: now });
    return 1;
  }
  record.count += 1;
  twoFAAttemptStore.set(key, record);
  return record.count;
};

const resetAttempts = (userId) => {
  twoFAAttemptStore.delete(String(userId));
};

module.exports = {
  setTwoFASession,
  getTwoFASession,
  deleteTwoFASession,
  getAttempts,
  incrementAttempts,
  resetAttempts,
  MAX_ATTEMPTS
};