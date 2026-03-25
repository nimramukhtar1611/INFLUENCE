// tests/security/2fa.test.js - FINAL COMPLETE VERSION
const request = require('supertest');
const { app } = require('../../server');
const User = require('../../models/User');
const Admin = require('../../models/Admin');
const Brand = require('../../models/Brand');
const speakeasy = require('speakeasy');

describe('Two-Factor Authentication (2FA) Tests', () => {
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;
  let testSecret;

  // Helper — always get fresh twoFAR reference
  const getTwoFAR = () => require('../../routes/twoFARoutes');

  beforeAll(async () => {
    await User.deleteMany({ email: '2fa-test@example.com' });
    await Admin.deleteMany({ email: 'admin-2fa@example.com' });

    testUser = await Brand.create({
      email: '2fa-test@example.com',
      password: 'TestPass123!',
      fullName: '2FA Test User',
      userType: 'brand',
      brandName: '2FA Test Brand',
      industry: 'Technology',
      emailVerified: true,
      status: 'active'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

    authToken = loginRes.body.token || loginRes.body.accessToken;
    if (!authToken) console.error('❌ Login failed:', loginRes.body);
  });

  afterAll(async () => {
    await User.deleteMany({ email: '2fa-test@example.com' });
    await Admin.deleteMany({ email: 'admin-2fa@example.com' });
  });

  // ==================== 2FA SETUP FLOW ====================
  describe('2FA Setup Flow', () => {
    test('Should generate 2FA secret', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/generate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data).toHaveProperty('qrCode');
      expect(res.body.data).toHaveProperty('otpauth_url');
      testSecret = res.body.data.secret;
    });

    test('Should verify and enable 2FA with valid token', async () => {
      const token = speakeasy.totp({ secret: testSecret, encoding: 'base32' });
      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('2FA enabled successfully');
      expect(res.body.data).toHaveProperty('backupCodes');
      expect(res.body.data.backupCodes.length).toBe(10);
    });

    test('Should reject invalid token during setup', async () => {
      // Generate fresh tempSecret first
      await request(app)
        .post('/api/auth/2fa/generate')
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid verification code');
    });

    test('Should get 2FA status', async () => {
      const res = await request(app)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enabled).toBe(true);
      expect(res.body.data.hasBackupCodes).toBe(true);
    });
  });

  // ==================== 2FA LOGIN FLOW ====================
  describe('2FA Login Flow', () => {
    test('Should require 2FA token after enabling', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.require2FA).toBe(true);
      expect(loginRes.body.userId).toBeDefined();
      expect(loginRes.body.token).toBeUndefined();
    });

    test('Should complete login with valid 2FA token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

      const userId = loginRes.body.userId;
      getTwoFAR().setTwoFASession(userId);

      const token = speakeasy.totp({ secret: testSecret, encoding: 'base32' });
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId, token });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body).toHaveProperty('token');
      expect(verifyRes.body).toHaveProperty('refreshToken');
    });

    test('Should reject invalid 2FA token during login', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

      const userId = loginRes.body.userId;
      getTwoFAR().resetAttempts(userId);
      getTwoFAR().setTwoFASession(userId);

      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId, token: '000000' });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error).toBe('Invalid 2FA code');
    });
  });

  // ==================== BACKUP CODES ====================
  describe('Backup Codes', () => {
    let backupCodes;

    test('Should generate backup codes during setup', async () => {
      const user = await User.findOne({ email: '2fa-test@example.com' }).select('+twoFactorBackupCodes');
      backupCodes = user.twoFactorBackupCodes;
      expect(backupCodes).toBeDefined();
      expect(backupCodes.length).toBe(10);
    });

    test('Should login with backup code', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

      const userId = loginRes.body.userId;
      getTwoFAR().resetAttempts(userId);
      getTwoFAR().setTwoFASession(userId);

      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId, token: backupCodes[0] });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.usedBackupCode).toBe(true);
      expect(verifyRes.body.remainingBackupCodes).toBe(9);
      expect(verifyRes.body).toHaveProperty('token');
    });

    test('Should not allow reusing backup code', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: '2fa-test@example.com', password: 'TestPass123!' });

      const userId = loginRes.body.userId;
      getTwoFAR().resetAttempts(userId);
      getTwoFAR().setTwoFASession(userId);

      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId, token: backupCodes[0] });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error).toBe('Invalid 2FA code');
    });
  });

  // ==================== 2FA MANAGEMENT ====================
  describe('2FA Management', () => {
    test('Should regenerate backup codes', async () => {
      const token = speakeasy.totp({ secret: testSecret, encoding: 'base32' });
      const res = await request(app)
        .post('/api/auth/2fa/regenerate-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('backupCodes');
      expect(res.body.data.backupCodes.length).toBe(10);
    });

    test('Should disable 2FA', async () => {
      const token = speakeasy.totp({ secret: testSecret, encoding: 'base32' });
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('2FA disabled successfully');

      const statusRes = await request(app)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${authToken}`);
      expect(statusRes.body.data.enabled).toBe(false);
    });

    test('Should not allow 2FA operations without valid token', async () => {
      // ✅ FIX: Reset attempts before re-enabling 2FA
      getTwoFAR().resetAttempts(testUser._id.toString());

      // Re-enable 2FA
      const genRes = await request(app)
        .post('/api/auth/2fa/generate')
        .set('Authorization', `Bearer ${authToken}`);
      testSecret = genRes.body.data?.secret || testSecret;

      const enableToken = speakeasy.totp({ secret: testSecret, encoding: 'base32' });
      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: enableToken });

      // Try disable with invalid token
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid verification code');
    });
  });

  // ==================== SECURITY TESTS ====================
  describe('Security Tests', () => {
    test('Should rate limit 2FA attempts', async () => {
      const userId = testUser._id.toString();
      const twoFAR = getTwoFAR();

      // ✅ Reset attempts — clean slate
      twoFAR.resetAttempts(userId);

      const attempts = [];
      for (let i = 0; i < 6; i++) {
        // Set session for every attempt
        twoFAR.setTwoFASession(userId);

        const res = await request(app)
          .post('/api/auth/2fa/verify-login')
          .send({ userId, token: `99999${i}` });
        attempts.push(res.status);
      }

      expect(attempts.slice(0, 5).every(status => status === 401)).toBe(true);
      expect(attempts[5]).toBe(429);
    });
  });

  // ==================== ADMIN 2FA ====================
  describe('Admin 2FA', () => {
    beforeAll(async () => {
      await Admin.deleteMany({ email: 'admin-2fa@example.com' });

      adminUser = await Admin.create({
        email: 'admin-2fa@example.com',
        password: 'AdminPass123!',
        fullName: 'Admin 2FA User',
        role: 'admin',
        isActive: true
      });

      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin-2fa@example.com', password: 'AdminPass123!' });

      adminToken = loginRes.body.token || loginRes.body.accessToken;
      if (!adminToken) console.error('❌ Admin login failed:', loginRes.body);
    });

    test('Admin should be able to setup 2FA', async () => {
      const res = await request(app)
        .post('/api/admin/2fa/generate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data).toHaveProperty('qrCode');
    });
  });
});