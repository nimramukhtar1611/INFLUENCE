// middleware/subscription.js
const Subscription = require('../models/Subscription');

// Check if user has access to feature based on subscription
const checkSubscriptionLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.findOne({ userId: req.user._id });

      if (!subscription) {
        // Free plan by default
        return next();
      }

      if (subscription.hasReachedLimit(limitType)) {
        return res.status(403).json({
          success: false,
          message: `You have reached your ${limitType} limit. Please upgrade your plan to continue.`,
          requiresUpgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      next();
    }
  };
};

// Check if user has specific plan or higher
const requirePlan = (requiredPlans) => {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.findOne({ userId: req.user._id });

      if (!subscription) {
        // Free plan by default
        if (requiredPlans.includes('free')) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'This feature requires a paid subscription. Please upgrade your plan.'
        });
      }

      if (requiredPlans.includes(subscription.planId)) {
        return next();
      }

      // Check if current plan is higher than required
      const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(subscription.planId);
      const requiredIndex = Math.max(...requiredPlans.map(p => planHierarchy.indexOf(p)));

      if (currentIndex >= requiredIndex) {
        return next();
      }

      res.status(403).json({
        success: false,
        message: 'This feature requires a higher subscription plan. Please upgrade your plan.'
      });
    } catch (error) {
      console.error('Plan check error:', error);
      next();
    }
  };
};

module.exports = {
  checkSubscriptionLimit,
  requirePlan
};