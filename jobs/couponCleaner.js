const Coupon = require('../model/couponModel');

const checkAndDeactivateCoupons = async () => {
  console.log('Running job: Checking for expired or exhausted coupons...');

  const now = new Date();

  try {
    // 1. Find and deactivate expired coupons
    const expiredCoupons = await Coupon.updateMany(
      {
        isActive: true,
        expiryDate: { $lt: now },
      },
      {
        $set: { isActive: false },
      }
    );

    if (expiredCoupons.modifiedCount > 0) {
      console.log(`Deactivated ${expiredCoupons.modifiedCount} expired coupons.`);
    }

    // 2. Find and deactivate coupons that reached max uses
    // Note: We can't easily do this with a single updateMany query if we need to compare two fields (usedCount >= maxUses)
    // efficiently without aggregation pipeline updates (which are available in newer Mongo, but let's be safe).
    // However, we can query for them and then update.
    // Or use $expr in updateMany (requires MongoDB 4.2+)
    
    // Using find and save loop for maxUses to be safe and simple, or updateMany with $expr if we are sure about version.
    // Let's use a find query that filters for the condition.
    
    const exhaustedCoupons = await Coupon.find({
      isActive: true,
      maxUses: { $ne: null },
      $expr: { $gte: ["$usedCount", "$maxUses"] }
    });

    if (exhaustedCoupons.length > 0) {
      const ids = exhaustedCoupons.map(c => c._id);
      const updateResult = await Coupon.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: false } }
      );
      console.log(`Deactivated ${updateResult.modifiedCount} exhausted coupons (max uses reached).`);
    } else {
        // console.log('No exhausted coupons found.');
    }

  } catch (error) {
    console.error('Error checking coupons:', error);
  }
};

const startCouponCleaner = () => {
  // Run immediately
  checkAndDeactivateCoupons();
  
  // Run every hour (adjust as needed)
  setInterval(checkAndDeactivateCoupons, 60 * 60 * 1000); 
  console.log('Coupon cleaner job started. Will run every hour.');
};

module.exports = { startCouponCleaner };
