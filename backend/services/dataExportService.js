// services/dataExportService.js - COMPLETE NEW FILE
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const ConsentLog = require('../models/ConsentLog');
const ExportRequest = require('../models/ExportRequest');
const QueueService = require('./queueService');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const csvGenerator = require('../utils/csvGenerator');

class DataExportService {
  
  /**
   * Start data export process
   */
  async startExport(userId) {
    try {
      // Check for existing export
      const existing = await ExportRequest.findOne({
        userId,
        status: { $in: ['pending', 'processing'] }
      });

      if (existing) {
        return existing;
      }

      // Create export request
      const exportRequest = await ExportRequest.create({
        userId,
        status: 'pending',
        progress: 0,
        requestedAt: new Date()
      });

      // Queue export job
      await QueueService.addDataExportJob({
        exportId: exportRequest._id,
        userId
      });

      return exportRequest;
    } catch (error) {
      console.error('Start export error:', error);
      throw error;
    }
  }

  /**
   * Process data export
   */
  async processExport(exportId, userId) {
    try {
      await ExportRequest.findByIdAndUpdate(exportId, {
        status: 'processing',
        progress: 10,
        startedAt: new Date()
      });

      // Collect all user data
      const userData = await this.collectUserData(userId);
      
      await ExportRequest.findByIdAndUpdate(exportId, {
        progress: 50
      });

      // Generate export file
      const fileInfo = await this.generateExportFile(userId, userData);

      await ExportRequest.findByIdAndUpdate(exportId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        fileUrl: fileInfo.url,
        fileSize: fileInfo.size,
        filename: fileInfo.filename,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Notify user
      const Notification = require('../models/Notification');
      await Notification.create({
        userId,
        type: 'system',
        title: 'Data Export Ready',
        message: 'Your data export is ready for download. It will be available for 7 days.',
        data: {
          exportId,
          url: `/api/compliance/export/${exportId}/download`
        }
      });

      return { success: true, exportId };
    } catch (error) {
      console.error('Process export error:', error);

      await ExportRequest.findByIdAndUpdate(exportId, {
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Collect all user data
   */
  async collectUserData(userId) {
    const data = {};

    // Basic profile
    const user = await User.findById(userId).lean();
    delete user.password;
    delete user.refreshToken;
    delete user.resetPasswordToken;
    delete user.emailVerificationToken;
    delete user.twoFactorSecret;
    data.profile = user;

    // Brand or creator specific
    if (user.userType === 'brand') {
      data.brand = await Brand.findById(userId).lean();
    } else if (user.userType === 'creator') {
      data.creator = await Creator.findById(userId).lean();
    }

    // Campaigns
    data.campaigns = await Campaign.find({ brandId: userId }).lean();

    // Deals
    data.deals = await Deal.find({
      $or: [{ brandId: userId }, { creatorId: userId }]
    }).lean();

    // Payments
    data.payments = await Payment.find({
      $or: [{ 'from.userId': userId }, { 'to.userId': userId }]
    }).lean();

    // Messages
    data.messages = await Message.find({ senderId: userId }).lean();

    // Notifications
    data.notifications = await Notification.find({ userId }).lean();

    // Consent logs
    data.consentLogs = await ConsentLog.find({ userId }).lean();

    return data;
  }

  /**
   * Generate export file
   */
  async generateExportFile(userId, data) {
    const timestamp = Date.now();
    const filename = `export-${userId}-${timestamp}.zip`;
    const filePath = path.join(__dirname, '../uploads/exports', filename);
    const publicUrl = `/uploads/exports/${filename}`;

    // Ensure directory exists
    const dir = path.join(__dirname, '../uploads/exports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create zip archive
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Add JSON files
    for (const [key, value] of Object.entries(data)) {
      archive.append(JSON.stringify(value, null, 2), { name: `${key}.json` });

      // Also add CSV version for tables
      if (Array.isArray(value) && value.length > 0) {
        const csv = csvGenerator.generateCSV(value);
        archive.append(csv, { name: `${key}.csv` });
      }
    }

    // Add README
    const readme = this.generateReadme(data);
    archive.append(readme, { name: 'README.txt' });

    await archive.finalize();

    // Get file size
    const stats = fs.statSync(filePath);
    const size = stats.size;

    return {
      filename,
      path: filePath,
      url: publicUrl,
      size: this.formatBytes(size)
    };
  }

  /**
   * Generate README file
   */
  generateReadme(data) {
    const date = new Date().toLocaleString();
    
    return `
INFLUENCEX DATA EXPORT
Generated: ${date}
User: ${data.profile?.email || 'Unknown'}

This export contains all your personal data stored on InfluenceX platform.

FILES INCLUDED:
${Object.keys(data).map(key => `- ${key}.json`).join('\n')}

DATA SUMMARY:
- Profile Information: Yes
- Campaigns: ${data.campaigns?.length || 0}
- Deals: ${data.deals?.length || 0}
- Transactions: ${data.payments?.length || 0}
- Messages: ${data.messages?.length || 0}
- Notifications: ${data.notifications?.length || 0}

RETENTION:
This export will be available for 7 days.

PRIVACY:
This file contains your personal data. Please keep it secure and delete after use.

For any questions, contact support@influencex.com
    `;
  }

  /**
   * Get active export
   */
  async getActiveExport(userId) {
    return ExportRequest.findOne({
      userId,
      status: { $in: ['pending', 'processing'] }
    });
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId, userId) {
    const exportRequest = await ExportRequest.findOne({
      _id: exportId,
      userId
    });

    if (!exportRequest) {
      return null;
    }

    return {
      status: exportRequest.status,
      progress: exportRequest.progress,
      createdAt: exportRequest.createdAt,
      completedAt: exportRequest.completedAt,
      fileUrl: exportRequest.fileUrl,
      fileSize: exportRequest.fileSize,
      expiresAt: exportRequest.expiresAt,
      error: exportRequest.error
    };
  }

  /**
   * Get export file
   */
  async getExportFile(exportId, userId) {
    const exportRequest = await ExportRequest.findOne({
      _id: exportId,
      userId,
      status: 'completed',
      expiresAt: { $gt: new Date() }
    });

    if (!exportRequest || !exportRequest.fileUrl) {
      return null;
    }

    const filePath = path.join(__dirname, '../uploads/exports', exportRequest.filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = fs.readFileSync(filePath);

    return {
      data,
      filename: exportRequest.filename,
      size: exportRequest.fileSize
    };
  }

  /**
   * Clean up old exports
   */
  async cleanupExports() {
    try {
      const expired = await ExportRequest.find({
        expiresAt: { $lt: new Date() }
      });

      for (const exp of expired) {
        // Delete file
        if (exp.filename) {
          const filePath = path.join(__dirname, '../uploads/exports', exp.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        // Delete record
        await ExportRequest.findByIdAndDelete(exp._id);
      }

      return expired.length;
    } catch (error) {
      console.error('Cleanup exports error:', error);
      return 0;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = new DataExportService();