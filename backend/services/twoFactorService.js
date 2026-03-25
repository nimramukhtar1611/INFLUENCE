// services/twoFactorService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const NotificationService = require('./notificationService');

class TwoFactorService {
  
  /**
   * Generate 2FA secret for user
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @returns {Promise<Object>} Secret and QR code
   */
  async generateSecret(userId, email) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `InfluenceX:${email}`,
        length: 20,
        issuer: 'InfluenceX'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Store temporary secret (will be verified before enabling)
      await User.findByIdAndUpdate(userId, {
        twoFactorTempSecret: secret.base32,
        twoFactorTempSecretExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      return {
        success: true,
        secret: secret.base32,
        qrCode,
        otpauth_url: secret.otpauth_url
      };
    } catch (error) {
      console.error('2FA secret generation error:', error);
      return {
        success: false,
        error: 'Failed to generate 2FA secret'
      };
    }
  }

  /**
   * Verify and enable 2FA
   * @param {string} userId - User ID
   * @param {string} token - TOTP token
   * @returns {Promise<Object>}
   */
  async verifyAndEnable(userId, token) {
    try {
      const user = await User.findById(userId).select('+twoFactorTempSecret +twoFactorTempSecretExpires');

      if (!user || !user.twoFactorTempSecret) {
        return {
          success: false,
          error: 'No pending 2FA setup found'
        };
      }

      // Check if temporary secret expired
      if (user.twoFactorTempSecretExpires < new Date()) {
        return {
          success: false,
          error: '2FA setup expired. Please try again.'
        };
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorTempSecret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 steps before/after for time drift
      });

      if (!verified) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      user.twoFactorSecret = user.twoFactorTempSecret;
      user.twoFactorTempSecret = undefined;
      user.twoFactorTempSecretExpires = undefined;
      user.twoFactorBackupCodes = this.generateBackupCodes();
      await user.save();

      // Send notification
      await NotificationService.createNotification(
        userId,
        'security',
        '2FA Enabled',
        'Two-factor authentication has been enabled on your account.',
        { type: 'security_update' },
        { priority: 'high' }
      );

      return {
        success: true,
        message: '2FA enabled successfully',
        backupCodes: user.twoFactorBackupCodes
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        error: 'Failed to verify 2FA code'
      };
    }
  }

  /**
   * Verify 2FA token for login
   * @param {string} userId - User ID
   * @param {string} token - TOTP token or backup code
   * @returns {Promise<Object>}
   */
  async regenerateBackupCodes(userId, token) {
  const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');
  if (!user) return { success: false, error: 'User not found' };
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2
  });
  if (!verified) return { success: false, error: 'Invalid verification code' };
  const newCodes = this.generateBackupCodes();
  user.twoFactorBackupCodes = newCodes;
  await user.save();
  return { success: true, backupCodes: newCodes };
}
  async verifyToken(userId, token) {
    try {
      const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');

      if (!user || !user.twoFactorEnabled) {
        return {
          success: false,
          error: '2FA not enabled for this user'
        };
      }

      // Check if it's a backup code
      if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.includes(token)) {
        // Remove used backup code
        user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(code => code !== token);
        await user.save();

        // Send alert about backup code usage
        await NotificationService.createNotification(
          userId,
          'security',
          'Backup Code Used',
          'A backup code was used to log into your account.',
          { type: 'security_alert' },
          { priority: 'high' }
        );

        return {
          success: true,
          usedBackupCode: true,
          remainingBackupCodes: user.twoFactorBackupCodes.length
        };
      }

      // Verify TOTP
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return {
          success: false,
          error: 'Invalid 2FA code'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('2FA token verification error:', error);
      return {
        success: false,
        error: 'Failed to verify 2FA code'
      };
    }
  }

  /**
   * Disable 2FA for user
   * @param {string} userId - User ID
   * @param {string} token - Current TOTP token for verification
   * @returns {Promise<Object>}
   */
  async disable(userId, token) {
    try {
      // First verify the token
      const verification = await this.verifyToken(userId, token);
      
      if (!verification.success) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Disable 2FA
      await User.findByIdAndUpdate(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined
      });

      // Send notification
      await NotificationService.createNotification(
        userId,
        'security',
        '2FA Disabled',
        'Two-factor authentication has been disabled on your account.',
        { type: 'security_update' },
        { priority: 'high' }
      );

      return {
        success: true,
        message: '2FA disabled successfully'
      };
    } catch (error) {
      console.error('2FA disable error:', error);
      return {
        success: false,
        error: 'Failed to disable 2FA'
      };
    }
  }

  /**
   * Generate new backup codes
   * @param {string} userId - User ID
   * @param {string} token - Current TOTP token for verification
   * @returns {Promise<Object>}
   */
  async regenerateBackupCodes(userId, token) {
    try {
      // Verify token first
      const verification = await this.verifyToken(userId, token);
      
      if (!verification.success) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      const newBackupCodes = this.generateBackupCodes();

      await User.findByIdAndUpdate(userId, {
        twoFactorBackupCodes: newBackupCodes
      });

      return {
        success: true,
        backupCodes: newBackupCodes
      };
    } catch (error) {
      console.error('Backup codes regeneration error:', error);
      return {
        success: false,
        error: 'Failed to regenerate backup codes'
      };
    }
  }

  /**
   * Generate backup codes
   * @param {number} count - Number of backup codes
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Get 2FA status for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getStatus(userId) {
    try {
      const user = await User.findById(userId).select('twoFactorEnabled twoFactorBackupCodes');

      return {
        success: true,
        enabled: user?.twoFactorEnabled || false,
        hasBackupCodes: user?.twoFactorBackupCodes?.length > 0,
        backupCodesCount: user?.twoFactorBackupCodes?.length || 0
      };
    } catch (error) {
      console.error('Get 2FA status error:', error);
      return {
        success: false,
        error: 'Failed to get 2FA status'
      };
    }
  }
}

module.exports = new TwoFactorService();