const cron = require('node-cron');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running notification jobs...');
  
  try {
    // Check for upcoming deadlines (24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingDeals = await Deal.find({
      deadline: { $lte: tomorrow, $gt: new Date() },
      status: { $in: ['accepted', 'in-progress'] }
    }).populate('creatorId brandId');

    for (const deal of upcomingDeals) {
      // Notify creator
      await Notification.create({
        userId: deal.creatorId._id,
        type: 'reminder',
        title: 'Deadline Approaching',
        message: `Your deal deadline is approaching (${deal.deadline.toLocaleDateString()})`,
        data: { dealId: deal._id }
      });

      // Send email
      await sendEmail({
        email: deal.creatorId.email,
        subject: 'Deadline Reminder - InfluenceX',
        html: `<p>Your deal deadline for campaign is approaching. Please submit your deliverables soon.</p>`
      });

      // Notify brand
      await Notification.create({
        userId: deal.brandId._id,
        type: 'reminder',
        title: 'Deadline Approaching',
        message: `A deal deadline is approaching`,
        data: { dealId: deal._id }
      });
    }

    console.log(`Sent ${upcomingDeals.length * 2} deadline reminders`);
  } catch (error) {
    console.error('Error in notification jobs:', error);
  }
});

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily cleanup jobs...');
  
  try {
    // Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Error in cleanup jobs:', error);
  }
});

module.exports = { runNotificationJobs: () => console.log('Notification jobs scheduled') };