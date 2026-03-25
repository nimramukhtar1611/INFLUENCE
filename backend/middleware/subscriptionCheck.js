// middleware/subscriptionCheck.js - COMPLETE FIXED VERSION
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const subscriptionPlans = require('../config/subscriptionPlans');

/**
 * Check if user has active subscription
 */
const hasActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] }
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        requiresUpgrade: true
      });
    }

    // Check if subscription is expired
    if (subscription.isExpired()) {
      subscription.status = 'expired';
      await subscription.save();
      
      return res.status(403).json({
        success: false,
        message: 'Subscription has expired',
        code: 'SUBSCRIPTION_EXPIRED',
        requiresUpgrade: true
      });
    }

    req.subscription = subscription;
    next();

  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription',
      error: error.message
    });
  }
};

/**
 * Check if user can perform specific action based on limits
 */
const checkActionLimit = (actionType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id;
      
      // Get subscription (if any)
      let subscription = req.subscription;
      
      if (!subscription) {
        subscription = await Subscription.findOne({
          userId,
          status: { $in: ['active', 'trialing'] }
        }).populate('planId');
      }

      // If no subscription, use free plan limits
      if (!subscription) {
        const freePlan = await Plan.findOne({ planId: 'free' });
        
        // Check free plan limits
        const limit = freePlan?.limits[actionType] || 0;
        
        // For demo purposes, allow some actions on free plan
        const allowedOnFree = ['search', 'create_campaign'].includes(actionType);
        
        if (!allowedOnFree && limit === 0) {
          return res.status(403).json({
            success: false,
            message: `This action requires a paid subscription`,
            code: 'PAID_PLAN_REQUIRED',
            requiresUpgrade: true
          });
        }

        // For actions that have limits, we'll need usage tracking
        // This would require a Usage model or tracking in User document
        req.subscription = null;
        return next();
      }

      // Check if action is allowed based on plan limits
      const plan = subscription.planId;
      const limit = plan?.limits[actionType] || 0;
      
      // Check if limit is unlimited (-1)
      if (limit === -1) {
        return next();
      }

      // Check usage
      const usageKey = `${actionType}Used`;
      const currentUsage = subscription.usage[usageKey] || 0;

      if (currentUsage >= limit) {
        return res.status(403).json({
          success: false,
          message: `You have reached your ${actionType} limit for this month`,
          code: 'LIMIT_REACHED',
          data: {
            limit,
            used: currentUsage,
            action: actionType,
            plan: plan.name,
            upgradeTo: this.getNextPlan(plan.planId)
          }
        });
      }

      req.subscription = subscription;
      next();

    } catch (error) {
      console.error('Action limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking action limits',
        error: error.message
      });
    }
  };
};

/**
 * Require specific plan tier
 */
const requireTier = (requiredTiers) => {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription;
      
      if (!subscription) {
        // Check if free tier is allowed
        const tiers = Array.isArray(requiredTiers) ? requiredTiers : [requiredTiers];
        if (tiers.includes('free')) {
          return next();
        }
        
        return res.status(403).json({
          success: false,
          message: 'This feature requires a paid subscription',
          code: 'PAID_PLAN_REQUIRED',
          requiresUpgrade: true
        });
      }

      const plan = subscription.planId;
      const tiers = Array.isArray(requiredTiers) ? requiredTiers : [requiredTiers];
      
      // Check if current plan meets requirement
      if (tiers.includes(plan.planId)) {
        return next();
      }

      // Check if current plan is higher than required (using hierarchy)
      const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(plan.planId);
      const requiredIndex = Math.min(...tiers.map(t => planHierarchy.indexOf(t)));

      if (currentIndex >= requiredIndex) {
        return next();
      }

      res.status(403).json({
        success: false,
        message: `This feature requires ${tiers.join(' or ')} plan`,
        code: 'TIER_REQUIRED',
        data: {
          required: tiers,
          current: plan.planId
        }
      });

    } catch (error) {
      console.error('Tier check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription tier',
        error: error.message
      });
    }
  };
};

/**
 * Check if user has specific feature
 */
const hasFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription;
      
      // Check feature availability in config
      const hasFeature = subscriptionPlans.hasFeature(
        subscription?.planId?.planId || 'free',
        featureName
      );

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `This feature is not available in your current plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiresUpgrade: true
        });
      }

      next();

    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature availability',
        error: error.message
      });
    }
  };
};

/**
 * Track usage middleware
 */
const trackUsage = (actionType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.json;
    
    res.json = async function(data) {
      // If request was successful and user has subscription, increment usage
      if (data.success && req.subscription) {
        try {
          const usageKey = `${actionType}Used`;
          req.subscription.usage[usageKey] = (req.subscription.usage[usageKey] || 0) + 1;
          await req.subscription.save();
        } catch (error) {
          console.error('Error tracking usage:', error);
        }
      }
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Check storage limit
 */
const checkStorageLimit = async (req, res, next) => {
  try {
    const subscription = req.subscription;
    
    if (!subscription) {
      // Check free plan storage limit
      const freePlan = await Plan.findOne({ planId: 'free' });
      const storageLimit = freePlan?.limits.storage || 100; // MB
      
      // This would need actual storage usage tracking
      req.storageLimit = storageLimit;
      return next();
    }

    const plan = subscription.planId;
    const storageLimit = plan?.limits.storage || 100; // MB
    
    // Get current storage usage (would come from a Storage model)
    const currentStorage = subscription.usage.storageUsed || 0;
    
    // Check if new upload would exceed limit
    const fileSize = req.body.file_size || 0; // Get file size from request
    const newTotal = currentStorage + (fileSize / (1024 * 1024)); // Convert to MB
    
    if (newTotal > storageLimit && storageLimit !== -1) {
      return res.status(403).json({
        success: false,
        message: 'Storage limit exceeded',
        code: 'STORAGE_LIMIT_EXCEEDED',
        data: {
          limit: storageLimit,
          used: currentStorage,
          requested: fileSize / (1024 * 1024),
          unit: 'MB'
        }
      });
    }

    next();

  } catch (error) {
    console.error('Storage check error:', error);
    next();
  }
};

/**
 * Check team member limit
 */
const checkTeamMemberLimit = async (req, res, next) => {
  try {
    const subscription = req.subscription;
    
    if (!subscription) {
      const freePlan = await Plan.findOne({ planId: 'free' });
      const teamLimit = freePlan?.limits.teamMembers || 1;
      
      req.teamLimit = teamLimit;
      return next();
    }

    const plan = subscription.planId;
    const teamLimit = plan?.limits.teamMembers || 1;
    
    // Get current team members count
    const Brand = require('../models/Brand');
    const brand = await Brand.findById(req.user._id);
    const currentMembers = brand?.teamMembers?.length || 0;
    
    if (currentMembers >= teamLimit && teamLimit !== -1) {
      return res.status(403).json({
        success: false,
        message: 'Team member limit reached',
        code: 'TEAM_LIMIT_REACHED',
        data: {
          limit: teamLimit,
          current: currentMembers
        }
      });
    }

    next();

  } catch (error) {
    console.error('Team limit check error:', error);
    next();
  }
};

/**
 * Get next plan for upgrade
 */
const getNextPlan = (currentPlanId) => {
  const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlanId);
  
  if (currentIndex < planHierarchy.length - 1) {
    return planHierarchy[currentIndex + 1];
  }
  
  return null;
};

/**
 * Check if user is in grace period
 */
const checkGracePeriod = async (req, res, next) => {
  try {
    const subscription = req.subscription;
    
    if (!subscription) {
      return next();
    }

    if (subscription.status === 'past_due') {
      const daysPastDue = Math.floor(
        (Date.now() - subscription.billingPeriod.end) / (24 * 60 * 60 * 1000)
      );
      
      const gracePeriodDays = 7;
      
      if (daysPastDue > gracePeriodDays) {
        subscription.status = 'expired';
        await subscription.save();
        
        return res.status(403).json({
          success: false,
          message: 'Your grace period has ended. Subscription expired.',
          code: 'GRACE_PERIOD_ENDED',
          requiresUpgrade: true
        });
      }
      
      // Add grace period info to request
      req.gracePeriod = {
        active: true,
        daysLeft: gracePeriodDays - daysPastDue,
        expiresAt: new Date(subscription.billingPeriod.end.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      };
    }

    next();

  } catch (error) {
    console.error('Grace period check error:', error);
    next();
  }
};

/**
 * Middleware to add subscription info to request
 */
const addSubscriptionInfo = async (req, res, next) => {
  try {
    if (req.user) {
      const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: { $in: ['active', 'trialing'] }
      }).populate('planId');

      req.subscription = subscription;
    }
    next();
  } catch (error) {
    console.error('Add subscription info error:', error);
    next();
  }
};

module.exports = {
  hasActiveSubscription,
  checkActionLimit,
  requireTier,
  hasFeature,
  trackUsage,
  checkStorageLimit,
  checkTeamMemberLimit,
  checkGracePeriod,
  addSubscriptionInfo
};