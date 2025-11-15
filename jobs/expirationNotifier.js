const Subscription = require('../model/subscriptionModel');
const sendEmail = require('../utils/sendEmail');

const checkAndNotifyForExpiringSubscriptions = async () => {
  console.log('Running job: Checking for expiring subscriptions...');

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      expiresAt: {
        $gte: now,
        $lte: sevenDaysFromNow,
      },
      expirationNotified: false,
    }).populate({
      path: 'user',
      select: 'name email'
    }).populate({
      path: 'plan',
      select: 'name'
    });

    if (expiringSubscriptions.length === 0) {
      console.log('No expiring subscriptions to notify today.');
      return;
    }

    console.log(`Found ${expiringSubscriptions.length} subscriptions to notify.`);

    for (const sub of expiringSubscriptions) {
      if (sub.user && sub.plan) {
        const message = `مرحبًا ${sub.user.name},\n\nهذا تذكير بأن اشتراكك في باقة \"${sub.plan.name}\" سينتهي قريبًا.\n\nتاريخ انتهاء الاشتراك: ${sub.expiresAt.toLocaleDateString()}.\n\nيرجى تجديد اشتراكك لمواصلة الاستمتاع بخدماتنا دون انقطاع.\n\nشكرًا لك,\nفريق AdWall`;

        try {
          await sendEmail({
            email: sub.user.email,
            subject: 'تذكير: اشتراكك سينتهي قريبًا',
            message,
          });

          // Mark as notified to prevent sending again
          sub.expirationNotified = true;
          await sub.save();
          console.log(`Expiration notification sent to ${sub.user.email}`);

        } catch (emailError) {
          console.error(`Failed to send expiration email to ${sub.user.email}:`, emailError);
        }
      }
    }
  } catch (dbError) {
    console.error('Error fetching expiring subscriptions:', dbError);
  }
};

const startExpirationNotifier = () => {
  // Run the job immediately on start, then every 24 hours
  checkAndNotifyForExpiringSubscriptions();
  setInterval(checkAndNotifyForExpiringSubscriptions, 24 * 60 * 60 * 1000); // 24 hours
  console.log('Subscription expiration notifier started. Will run every 24 hours.');
};

module.exports = { startExpirationNotifier };
