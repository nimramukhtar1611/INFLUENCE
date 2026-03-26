// services/twoFactorService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const Admin = require('../models/Admin');
const NotificationService = require('./notificationService');

class TwoFactorService {
  
  /**
   * Helper to find user or admin by ID
   * @private
   */
  async _findRecord(userId, select = '') {
    // Try User first
    let record = await User.findById(userId).select(select);
    if (record) return record;
    
    // Try Admin second
    record = await Admin.findById(userId).select(select);
    return record;
  }

  /**
   * Generate 2FA secret for user
   * @param {string} userId - User/Admin ID
   * @param {string} email - User/Admin email
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

      // Store temporary secret
      const update = {
        twoFactorTempSecret: secret.base32,
        twoFactorTempSecretExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      };

      // Try User
      let success = await User.findByIdAndUpdate(userId, update);
      if (!success) {
        // Try Admin
        success = await Admin.findByIdAndUpdate(userId, update);
      }

      if (!success) {
        return { success: false, error: 'User or Admin not found' };
      }

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
   * @param {string} userId - User/Admin ID
   * @param {string} token - TOTP token
   * @returns {Promise<Object>}
   */
  async verifyAndEnable(userId, token) {
    try {
      const record = await this._findRecord(userId, '+twoFactorTempSecret +twoFactorTempSecretExpires');

      if (!record || !record.twoFactorTempSecret) {
        return {
          success: false,
          error: 'No pending 2FA setup found'
        };
      }

      // Check if temporary secret expired
      if (record.twoFactorTempSecretExpires < new Date()) {
        return {
          success: false,
          error: '2FA setup expired. Please try again.'
        };
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: record.twoFactorTempSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Enable 2FA
      record.twoFactorEnabled = true;
      record.twoFactorSecret = record.twoFactorTempSecret;
      record.twoFactorTempSecret = undefined;
      record.twoFactorTempSecretExpires = undefined;
      record.twoFactorBackupCodes = this.generateBackupCodes();
      await record.save();

      // Send notification (Only for Users as Admin might not have notification integration yet)
      if (record.constructor.modelName === 'User') {
        await NotificationService.createNotification(
          userId,
          'security',
          '2FA Enabled',
          'Two-factor authentication has been enabled on your account.',
          { type: 'security_update' },
          { priority: 'high' }
        );
      }

      return {
        success: true,
        message: '2FA enabled successfully',
        backupCodes: record.twoFactorBackupCodes
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
  async verifyToken(userId, token) {
    try {
      const record = await this._findRecord(userId, '+twoFactorSecret +twoFactorBackupCodes');

      if (!record || !record.twoFactorEnabled) {
        return {
          success: false,
          error: '2FA not enabled for this user'
        };
      }

      // Check if it's a backup code
      if (record.twoFactorBackupCodes && record.twoFactorBackupCodes.includes(token)) {
        // Remove used backup code
        record.twoFactorBackupCodes = record.twoFactorBackupCodes.filter(code => code !== token);
        await record.save();

        if (record.constructor.modelName === 'User') {
          await NotificationService.createNotification(
            userId,
            'security',
            'Backup Code Used',
            'A backup code was used to log into your account.',
            { type: 'security_alert' },
            { priority: 'high' }
          );
        }

        return {
          success: true,
          usedBackupCode: true,
          remainingBackupCodes: record.twoFactorBackupCodes.length
        };
      }

      // Verify TOTP
      const verified = speakeasy.totp.verify({
        secret: record.twoFactorSecret,
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
   */
  async disable(userId, token) {
    try {
      const verification = await this.verifyToken(userId, token);
      
      if (!verification.success) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Try User update
      let updated = await User.findByIdAndUpdate(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined
      });

      if (!updated) {
        // Try Admin update
        updated = await Admin.findByIdAndUpdate(userId, {
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
          twoFactorBackupCodes: undefined
        });
      }

      if (updated && updated.constructor.modelName === 'User') {
        await NotificationService.createNotification(
          userId,
          'security',
          '2FA Disabled',
          'Two-factor authentication has been disabled on your account.',
          { type: 'security_update' },
          { priority: 'high' }
        );
      }

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
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId, token) {
    try {
      const verification = await this.verifyToken(userId, token);
      
      if (!verification.success) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      const newBackupCodes = this.generateBackupCodes();

      let updated = await User.findByIdAndUpdate(userId, {
        twoFactorBackupCodes: newBackupCodes
      });

      if (!updated) {
        updated = await Admin.findByIdAndUpdate(userId, {
          twoFactorBackupCodes: newBackupCodes
        });
      }

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
   * Get 2FA status for user/admin
   * @param {string} userId - User/Admin ID
   * @returns {Promise<Object>}
   */
  async getStatus(userId) {
    try {
      const record = await this._findRecord(userId, 'twoFactorEnabled twoFactorBackupCodes');

      return {
        success: true,
        enabled: record?.twoFactorEnabled || false,
        hasBackupCodes: record?.twoFactorBackupCodes?.length > 0,
        backupCodesCount: record?.twoFactorBackupCodes?.length || 0
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