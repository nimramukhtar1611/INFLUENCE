const cron = require('node-cron');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const Invitation = require('../models/Invitation');
const Payment = require('../models/Payment');
const { sendEmail } = require('../services/emailService');
const analyticsService = require('../services/analyticsService');

// Run every hour - Check for approaching deadlines
cron.schedule('0 * * * *', async () => {
  console.log('🕐 Running deadline checks...');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const deals = await Deal.find({
      deadline: { $lte: tomorrow, $gt: new Date() },
      status: { $in: ['accepted', 'in-progress'] }
    }).populate('creatorId brandId');

    for (const deal of deals) {
      // Notify creator
      await Notification.create({
        userId: deal.creatorId._id,
        type: 'reminder',
        title: 'Deadline Approaching',
        message: `Your deal deadline is tomorrow (${deal.deadline.toLocaleDateString()})`,
        data: { dealId: deal._id }
      });

      // Notify brand
      await Notification.create({
        userId: deal.brandId._id,
        type: 'reminder',
        title: 'Deadline Approaching',
        message: `A deal deadline is tomorrow`,
        data: { dealId: deal._id }
      });
    }

    console.log(`✅ Sent ${deals.length * 2} deadline reminders`);
  } catch (error) {
    console.error('❌ Deadline check error:', error);
  }
});

// Run daily at midnight - Generate daily reports
cron.schedule('0 0 * * *', async () => {
  console.log('📊 Generating daily reports...');
  
  try {
    // Generate daily analytics
    await analyticsService.generateDailyAnalytics();

    // Send scheduled reports
    const reports = await Report.find({
      isScheduled: true,
      'schedule.frequency': 'daily',
      'schedule.nextRun': { $lte: new Date() }
    }).populate('userId', 'email fullName');

    for (const report of reports) {
      try {
        // Generate report
        const data = await analyticsService.generateReport(report._id, report.config);
        
        // Send emails
        for (const email of report.schedule.recipients) {
          await sendEmail({
            email,
            subject: `Daily Report: ${report.name}`,
            template: 'report',
            data: {
              name: report.userId.fullName,
              reportName: report.name,
              reportUrl: `${process.env.FRONTEND_URL}/reports/${report._id}`,
              summary: data.summary
            }
          });
        }

        // Update next run
        const nextRun = new Date();
        nextRun.setDate(nextRun.getDate() + 1);
        report.schedule.nextRun = nextRun;
        report.schedule.lastRun = new Date();
        await report.save();

        console.log(`✅ Sent report: ${report.name}`);
      } catch (error) {
        console.error(`❌ Failed to send report ${report._id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Daily report generation error:', error);
  }
});

// Run weekly on Monday - Generate weekly reports
cron.schedule('0 0 * * 1', async () => {
  console.log('📊 Generating weekly reports...');
  
  try {
    await analyticsService.generateWeeklyAnalytics();

    const reports = await Report.find({
      isScheduled: true,
      'schedule.frequency': 'weekly',
      'schedule.nextRun': { $lte: new Date() }
    });

    // Similar to daily but for weekly
    // ... implementation
  } catch (error) {
    console.error('❌ Weekly report generation error:', error);
  }
});

// Run monthly on 1st - Generate monthly reports
cron.schedule('0 0 1 * *', async () => {
  console.log('📊 Generating monthly reports...');
  
  try {
    await analyticsService.generateMonthlyAnalytics();

    const reports = await Report.find({
      isScheduled: true,
      'schedule.frequency': 'monthly',
      'schedule.nextRun': { $lte: new Date() }
    });

    // Similar to daily but for monthly
    // ... implementation
  } catch (error) {
    console.error('❌ Monthly report generation error:', error);
  }
});

// Run daily - Clean up old notifications
cron.schedule('0 1 * * *', async () => {
  console.log('🧹 Cleaning up old data...');
  
  try {
    // Delete read notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`✅ Deleted ${result.deletedCount} old notifications`);

    // Delete expired invitations
    const expiredInvites = await Invitation.deleteMany({
      status: 'pending',
      expiresAt: { $lt: new Date() }
    });

    console.log(`✅ Deleted ${expiredInvites.deletedCount} expired invitations`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
});

// Run every 5 minutes - Process pending tasks
cron.schedule('*/5 * * * *', async () => {
  console.log('⚙️ Processing pending tasks...');
  
  try {
    // Check for stuck payments
    const pendingPayments = await Payment.find({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // Older than 30 minutes
    });

    for (const payment of pendingPayments) {
      payment.status = 'failed';
      payment.metadata = {
        ...payment.metadata,
        failureReason: 'Payment timeout'
      };
      await payment.save();

      // Notify user
      await Notification.create({
        userId: payment.from.userId,
        type: 'payment',
        title: 'Payment Failed',
        message: 'Your payment timed out. Please try again.',
        data: { paymentId: payment._id }
      });
    }

    console.log(`✅ Processed ${pendingPayments.length} pending payments`);
  } catch (error) {
    console.error('❌ Task processing error:', error);
  }
});

module.exports = () => {
  console.log('⏰ Cron jobs scheduled');
};