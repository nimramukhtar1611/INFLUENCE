// utils/cronJobs.js - COMPLETE PRODUCTION-READY VERSION
const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('./logger'); // If exists; otherwise console fallback
const { sendEmail } = require('../services/emailService');
const analyticsService = require('../services/analyticsService');
const Notification = require('../models/Notification');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const TokenBlacklist = require('../models/TokenBlacklist');
const Invitation = require('../models/Invitation');

// Simple logger fallback if not available
const log = logger || {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

class CronJobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize all cron jobs
   */
  initializeAll() {
    if (this.isRunning) {
      log.warn('⚠️ Cron jobs already initialized');
      return;
    }

    log.info('🚀 Initializing all cron jobs...');

    // Run every minute – check for approaching deadlines (1 minute reminder)
    this.addJob('deadline-check-minute', '*/1 * * * *', () => this.checkDeadlines(true));

    // Run every hour – full deadline checks
    this.addJob('deadline-check-hourly', '0 * * * *', () => this.checkDeadlines());

    // Run every 5 minutes – process pending tasks (e.g., stuck payments)
    this.addJob('pending-tasks', '*/5 * * * *', () => this.processPendingTasks());

    // Run every 30 minutes – session cleanup (if needed)
    // this.addJob('session-cleanup', '*/30 * * * *', () => this.cleanupSessions());

    // Run hourly – process payments (e.g., release escrow after approval)
    this.addJob('payment-processing', '0 * * * *', () => this.processPayments());

    // Run daily at midnight – generate daily analytics and reports
    this.addJob('daily-reports', '0 0 * * *', () => this.generateDailyReports());

    // Run daily at 1 AM – cleanup old data
    this.addJob('daily-cleanup', '0 1 * * *', () => this.cleanupOldData());

    // Run daily at 2 AM – database backup (if backup service exists)
    // this.addJob('daily-backup', '0 2 * * *', () => this.createBackup());

    // Run daily at 3 AM – aggregate analytics
    this.addJob('analytics-aggregation', '0 3 * * *', () => this.aggregateAnalytics());

    // Run weekly on Monday at 4 AM – generate weekly reports
    this.addJob('weekly-reports', '0 4 * * 1', () => this.generateWeeklyReports());

    // Run monthly on 1st at 5 AM – generate monthly reports
    this.addJob('monthly-reports', '0 5 1 * *', () => this.generateMonthlyReports());

    // Run every 6 hours – token blacklist cleanup
    this.addJob('token-cleanup', '0 */6 * * *', () => this.cleanupTokenBlacklist());

    this.isRunning = true;
    log.info('✅ All cron jobs initialized successfully');
  }

  /**
   * Add a cron job
   * @param {string} name - Job identifier
   * @param {string} schedule - Cron schedule expression
   * @param {Function} task - Async function to execute
   */
  addJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      log.warn(`⚠️ Job ${name} already exists, stopping existing job`);
      this.stopJob(name);
    }

    const job = cron.schedule(schedule, async () => {
      try {
        log.info(`⏰ Running cron job: ${name}`);
        const startTime = Date.now();

        await task();

        const duration = Date.now() - startTime;
        log.info(`✅ Cron job ${name} completed in ${duration}ms`);
      } catch (error) {
        log.error(`❌ Cron job ${name} failed:`, error);

        // Send alert for critical job failures (e.g., backup, payment)
        if (name.includes('backup') || name.includes('payment')) {
          await this.sendAlert(`Cron job ${name} failed`, error.message);
        }
      }
    });

    this.jobs.set(name, job);
    log.info(`📅 Scheduled job: ${name} - ${schedule}`);
  }

  /**
   * Stop a specific job
   * @param {string} name - Job identifier
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      log.info(`🛑 Stopped cron job: ${name}`);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      log.info(`🛑 Stopped cron job: ${name}`);
    });
    this.jobs.clear();
    this.isRunning = false;
    log.info('✅ All cron jobs stopped');
  }

  /**
   * Send alert for critical failures
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   */
  async sendAlert(title, message) {
    try {
      const admins = await User.find({ userType: 'admin' }).select('email');
      for (const admin of admins) {
        await sendEmail({
          email: admin.email,
          subject: `⚠️ Cron Job Alert: ${title}`,
          html: `<p><strong>${title}</strong></p><p>${message}</p><p>Time: ${new Date().toLocaleString()}</p>`,
        }).catch((e) => log.error('Failed to send alert email:', e));
      }

      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type: 'system',
          title,
          message,
          priority: 'high',
        }).catch((e) => log.error('Failed to create notification:', e));
      }
    } catch (error) {
      log.error('Error sending alert:', error);
    }
  }

  // ==================== JOB IMPLEMENTATIONS ====================

  /**
   * Check approaching and overdue deadlines
   * @param {boolean} minuteCheck - Whether this is the minute-level check (send 1-hour reminders)
   */
  async checkDeadlines(minuteCheck = false) {
    log.info('🕐 Running deadline checks...');

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const in24Hours = new Date(now);
      in24Hours.setHours(in24Hours.getHours() + 24);

      // Find deals with deadlines in the next 24 hours
      const upcomingDeals = await Deal.find({
        deadline: { $lte: tomorrow, $gt: now },
        status: { $in: ['accepted', 'in-progress'] },
      }).populate('creatorId brandId');

      // Find overdue deals
      const overdueDeals = await Deal.find({
        deadline: { $lt: now },
        status: { $in: ['accepted', 'in-progress', 'revision'] },
      }).populate('creatorId brandId');

      log.info(`Found ${upcomingDeals.length} upcoming deadlines, ${overdueDeals.length} overdue deals`);

      // Process upcoming deadlines
      for (const deal of upcomingDeals) {
        const hoursLeft = Math.ceil((deal.deadline - now) / (1000 * 60 * 60));

        // For minute checks, only notify when exactly 1 hour remains (or less)
        if (minuteCheck && hoursLeft !== 1 && hoursLeft !== 0) continue;

        // Notify creator
        await Notification.create({
          userId: deal.creatorId._id,
          type: 'reminder',
          title: 'Deadline Approaching',
          message: `Your deal deadline is ${hoursLeft} hours away (${deal.deadline.toLocaleDateString()})`,
          priority: hoursLeft <= 6 ? 'high' : 'medium',
          data: { dealId: deal._id, url: `/creator/deals/${deal._id}` },
        }).catch((e) => log.error('Failed to create notification:', e));

        // Notify brand
        await Notification.create({
          userId: deal.brandId._id,
          type: 'reminder',
          title: 'Deadline Approaching',
          message: `A deal deadline is ${hoursLeft} hours away`,
          priority: hoursLeft <= 6 ? 'high' : 'medium',
          data: { dealId: deal._id, url: `/brand/deals/${deal._id}` },
        }).catch((e) => log.error('Failed to create notification:', e));

        // Send email for urgent deadlines (<= 6 hours)
        if (hoursLeft <= 6 && deal.creatorId.email) {
          await sendEmail({
            email: deal.creatorId.email,
            subject: `🚨 URGENT: Deal Deadline in ${hoursLeft} Hours`,
            html: `<p>Your deal for "${deal.campaignId?.title || 'Deal'}" is due in ${hoursLeft} hours.</p>
                   <p>Please submit your deliverables as soon as possible.</p>
                   <a href="${process.env.FRONTEND_URL}/creator/deals/${deal._id}">View Deal</a>`,
          }).catch((e) => log.error('Failed to send email:', e));
        }
      }

      // Process overdue deals
      for (const deal of overdueDeals) {
        if (deal.status !== 'overdue') {
          deal.status = 'overdue';
          deal.timeline.push({
            event: 'Deal Overdue',
            description: 'Deal deadline passed',
            createdAt: new Date(),
          });
          await deal.save();
        }

        // Notify both parties
        await Notification.create({
          userId: deal.creatorId._id,
          type: 'alert',
          title: 'Deal Overdue',
          message: 'Your deal deadline has passed. Please contact the brand immediately.',
          priority: 'high',
          data: { dealId: deal._id },
        }).catch((e) => log.error('Failed to create notification:', e));

        await Notification.create({
          userId: deal.brandId._id,
          type: 'alert',
          title: 'Deal Overdue',
          message: 'A deal deadline has passed. Please contact the creator.',
          priority: 'high',
          data: { dealId: deal._id },
        }).catch((e) => log.error('Failed to create notification:', e));
      }

      log.info(`✅ Sent ${upcomingDeals.length * 2} deadline reminders, marked ${overdueDeals.length} deals overdue`);
    } catch (error) {
      log.error('❌ Deadline check error:', error);
    }
  }

  /**
   * Process pending payments (stuck, etc.)
   */
  async processPayments() {
    log.info('💰 Processing payment jobs...');

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const stuckPayments = await Payment.find({
        status: 'pending',
        createdAt: { $lt: thirtyMinutesAgo },
      });

      for (const payment of stuckPayments) {
        payment.status = 'failed';
        payment.metadata = {
          ...payment.metadata,
          failureReason: 'Payment timeout',
        };
        await payment.save();

        // Notify user
        await Notification.create({
          userId: payment.from.userId,
          type: 'payment',
          title: 'Payment Failed',
          message: 'Your payment timed out. Please try again.',
          priority: 'high',
          data: { paymentId: payment._id },
        }).catch((e) => log.error('Failed to create notification:', e));
      }

      log.info(`✅ Processed ${stuckPayments.length} stuck payments`);
    } catch (error) {
      log.error('❌ Payment processing error:', error);
    }
  }

  /**
   * Process pending tasks (e.g., accepted deals not started, revisions pending)
   */
  async processPendingTasks() {
    log.info('⚙️ Processing pending tasks...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Deals accepted but not started for > 24 hours
      const pendingDeals = await Deal.find({
        status: 'accepted',
        updatedAt: { $lt: twentyFourHoursAgo },
      }).populate('creatorId');

      for (const deal of pendingDeals) {
        await Notification.create({
          userId: deal.creatorId._id,
          type: 'reminder',
          title: 'Start Your Deal',
          message: 'You have accepted a deal but haven\'t started working on it. Please begin as soon as possible.',
          data: { dealId: deal._id },
        }).catch((e) => log.error('Failed to create notification:', e));
      }

      // Deals in revision for > 3 days
      const revisionDeals = await Deal.find({
        status: 'revision',
        updatedAt: { $lt: threeDaysAgo },
      });

      for (const deal of revisionDeals) {
        await Notification.create({
          userId: deal.creatorId,
          type: 'reminder',
          title: 'Revision Required',
          message: 'Please address the revision requests for your deal.',
          data: { dealId: deal._id },
        }).catch((e) => log.error('Failed to create notification:', e));
      }

      log.info(`✅ Processed ${pendingDeals.length} pending deals, ${revisionDeals.length} revision deals`);
    } catch (error) {
      log.error('❌ Pending tasks error:', error);
    }
  }

  /**
   * Generate daily analytics and reports
   */
  async generateDailyReports() {
    log.info('📊 Generating daily reports...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Generate daily analytics
      await analyticsService.generateDailyAnalytics(yesterday);

      // Send scheduled reports
      const reports = await Report.find({
        isScheduled: true,
        'schedule.frequency': 'daily',
        'schedule.nextRun': { $lte: new Date() },
      }).populate('userId', 'email fullName');

      for (const report of reports) {
        try {
          const data = await analyticsService.generateReport(report.userId._id, report.config);

          for (const email of report.schedule.recipients) {
            await sendEmail({
              email,
              subject: `Daily Report: ${report.name}`,
              html: `
                <h2>${report.name}</h2>
                <p>Hi ${report.userId.fullName},</p>
                <p>Your daily report is ready.</p>
                <p><strong>Summary:</strong></p>
                <ul>
                  <li>Total: ${data.summary?.total || 0}</li>
                  <li>Average: ${data.summary?.average || 0}</li>
                </ul>
                <p><a href="${process.env.FRONTEND_URL}/reports/${report._id}">View Full Report</a></p>
              `,
            }).catch((e) => log.error('Failed to send report email:', e));
          }

          // Update next run
          const nextRun = new Date();
          nextRun.setDate(nextRun.getDate() + 1);
          report.schedule.nextRun = nextRun;
          report.schedule.lastRun = new Date();
          await report.save();

          log.info(`✅ Sent daily report: ${report.name}`);
        } catch (error) {
          log.error(`❌ Failed to send report ${report._id}:`, error);
        }
      }
    } catch (error) {
      log.error('❌ Daily report generation error:', error);
    }
  }

  /**
   * Generate weekly reports
   */
  async generateWeeklyReports() {
    log.info('📊 Generating weekly reports...');

    try {
      await analyticsService.generateWeeklyAnalytics();

      const reports = await Report.find({
        isScheduled: true,
        'schedule.frequency': 'weekly',
        'schedule.nextRun': { $lte: new Date() },
      }).populate('userId', 'email fullName');

      for (const report of reports) {
        try {
          const data = await analyticsService.generateReport(report.userId._id, report.config);

          for (const email of report.schedule.recipients) {
            await sendEmail({
              email,
              subject: `Weekly Report: ${report.name}`,
              html: `
                <h2>${report.name}</h2>
                <p>Hi ${report.userId.fullName},</p>
                <p>Your weekly report is ready.</p>
                <p><a href="${process.env.FRONTEND_URL}/reports/${report._id}">View Full Report</a></p>
              `,
            }).catch((e) => log.error('Failed to send weekly report email:', e));
          }

          const nextRun = new Date();
          nextRun.setDate(nextRun.getDate() + 7);
          report.schedule.nextRun = nextRun;
          report.schedule.lastRun = new Date();
          await report.save();

          log.info(`✅ Sent weekly report: ${report.name}`);
        } catch (error) {
          log.error(`❌ Failed to send weekly report ${report._id}:`, error);
        }
      }
    } catch (error) {
      log.error('❌ Weekly report generation error:', error);
    }
  }

  /**
   * Generate monthly reports
   */
  async generateMonthlyReports() {
    log.info('📊 Generating monthly reports...');

    try {
      await analyticsService.generateMonthlyAnalytics();

      const reports = await Report.find({
        isScheduled: true,
        'schedule.frequency': 'monthly',
        'schedule.nextRun': { $lte: new Date() },
      }).populate('userId', 'email fullName');

      for (const report of reports) {
        try {
          const data = await analyticsService.generateReport(report.userId._id, report.config);

          for (const email of report.schedule.recipients) {
            await sendEmail({
              email,
              subject: `Monthly Report: ${report.name}`,
              html: `
                <h2>${report.name}</h2>
                <p>Hi ${report.userId.fullName},</p>
                <p>Your monthly report is ready.</p>
                <p><a href="${process.env.FRONTEND_URL}/reports/${report._id}">View Full Report</a></p>
              `,
            }).catch((e) => log.error('Failed to send monthly report email:', e));
          }

          const nextRun = new Date();
          nextRun.setMonth(nextRun.getMonth() + 1);
          report.schedule.nextRun = nextRun;
          report.schedule.lastRun = new Date();
          await report.save();

          log.info(`✅ Sent monthly report: ${report.name}`);
        } catch (error) {
          log.error(`❌ Failed to send monthly report ${report._id}:`, error);
        }
      }
    } catch (error) {
      log.error('❌ Monthly report generation error:', error);
    }
  }

  /**
   * Aggregate analytics (run after daily reports)
   */
  async aggregateAnalytics() {
    log.info('📊 Running analytics aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Ensure daily analytics exist
      await analyticsService.generateDailyAnalytics(yesterday);

      // Check if it's end of week (Sunday)
      if (yesterday.getDay() === 0) {
        await analyticsService.generateWeeklyAnalytics(yesterday);
      }

      // Check if it's end of month
      const lastDayOfMonth = new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0);
      if (yesterday.getDate() === lastDayOfMonth.getDate()) {
        await analyticsService.generateMonthlyAnalytics(yesterday);
      }

      log.info('✅ Analytics aggregation completed');
    } catch (error) {
      log.error('❌ Analytics aggregation error:', error);
    }
  }

  /**
   * Clean up old data (notifications, invitations, expired tokens)
   */
  async cleanupOldData() {
    log.info('🧹 Running data cleanup...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Delete read notifications older than 30 days
      const oldReadNotifs = await Notification.deleteMany({
        read: true,
        createdAt: { $lt: thirtyDaysAgo },
      });

      // Delete unread notifications older than 90 days
      const veryOldNotifs = await Notification.deleteMany({
        read: false,
        createdAt: { $lt: ninetyDaysAgo },
      });

      // Delete expired invitations
      const expiredInvites = await Invitation.deleteMany({
        status: 'pending',
        expiresAt: { $lt: new Date() },
      });

      // Delete expired password reset tokens
      const expiredResets = await User.updateMany(
        {
          resetPasswordExpire: { $lt: new Date() },
          resetPasswordToken: { $exists: true },
        },
        {
          $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 },
        }
      );

      // Delete expired email verification tokens
      const expiredVerifications = await User.updateMany(
        {
          emailVerificationExpire: { $lt: new Date() },
          emailVerificationToken: { $exists: true },
        },
        {
          $unset: { emailVerificationToken: 1, emailVerificationExpire: 1 },
        }
      );

      log.info(`✅ Cleaned up:
        - ${oldReadNotifs.deletedCount} old read notifications
        - ${veryOldNotifs.deletedCount} very old unread notifications
        - ${expiredInvites.deletedCount} expired invitations
        - ${expiredResets.modifiedCount} expired reset tokens
        - ${expiredVerifications.modifiedCount} expired verification tokens`);
    } catch (error) {
      log.error('❌ Data cleanup error:', error);
    }
  }

  /**
   * Clean up expired tokens in blacklist
   */
  async cleanupTokenBlacklist() {
    log.info('🧹 Running token blacklist cleanup...');

    try {
      const result = await TokenBlacklist.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      log.info(`✅ Cleaned up ${result.deletedCount} expired blacklisted tokens`);
    } catch (error) {
      log.error('❌ Token blacklist cleanup error:', error);
    }
  }

  /**
   * Get status of all jobs
   */
  getJobStatus() {
    const status = [];
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: true,
        nextRun: job.nextDates ? job.nextDates().toJSDate() : null,
      });
    });
    return status;
  }

  /**
   * Manually run a job by name
   * @param {string} jobName - Job identifier
   */
  async runJobManually(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    log.info(`▶️ Manually running job: ${jobName}`);

    switch (jobName) {
      case 'deadline-check-minute':
        await this.checkDeadlines(true);
        break;
      case 'deadline-check-hourly':
        await this.checkDeadlines();
        break;
      case 'pending-tasks':
        await this.processPendingTasks();
        break;
      case 'payment-processing':
        await this.processPayments();
        break;
      case 'daily-reports':
        await this.generateDailyReports();
        break;
      case 'weekly-reports':
        await this.generateWeeklyReports();
        break;
      case 'monthly-reports':
        await this.generateMonthlyReports();
        break;
      case 'analytics-aggregation':
        await this.aggregateAnalytics();
        break;
      case 'daily-cleanup':
        await this.cleanupOldData();
        break;
      case 'token-cleanup':
        await this.cleanupTokenBlacklist();
        break;
      default:
        throw new Error(`No handler for job ${jobName}`);
    }

    log.info(`✅ Manual job ${jobName} completed`);
  }
}

// Create singleton instance
const cronJobManager = new CronJobManager();

module.exports = cronJobManager;