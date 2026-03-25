// config/subscriptionPlans.js - COMPLETE FIXED VERSION

module.exports = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      interval: 'month',
      description: 'Perfect for getting started',
      features: [
        'Up to 3 campaigns',
        'Basic creator search',
        'Email support',
        'Standard contracts',
        'Basic analytics',
        '1 team member'
      ],
      limits: {
        campaigns: 3,
        activeDeals: 2,
        teamMembers: 1,
        storage: 100, // MB
        apiCalls: 1000, // per month
        analytics: false,
        api_access: false,
        priority_support: false,
        custom_branding: false
      },
      stripePriceId: {
        month: null,
        year: null
      },
      metadata: {
        popular: false,
        color: '#6B7280'
      }
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      currency: 'USD',
      interval: 'month',
      description: 'For growing brands and creators',
      features: [
        'Up to 10 campaigns',
        'Advanced creator search',
        'Priority email support',
        'Custom contracts',
        'Advanced analytics',
        'Basic API access',
        'Team members (up to 3)',
        'Performance tracking'
      ],
      limits: {
        campaigns: 10,
        activeDeals: 5,
        teamMembers: 3,
        storage: 500, // MB
        apiCalls: 5000, // per month
        analytics: true,
        api_access: true,
        priority_support: false,
        custom_branding: false
      },
      stripePriceId: {
        month: 'price_starter_monthly', // Replace with actual Stripe price IDs
        year: 'price_starter_yearly'
      },
      metadata: {
        popular: false,
        color: '#3B82F6'
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 149,
      currency: 'USD',
      interval: 'month',
      description: 'For serious marketers and creators',
      features: [
        'Unlimited campaigns',
        'AI-powered creator matching',
        '24/7 priority support',
        'Advanced contracts with e-sign',
        'Real-time analytics',
        'Full API access',
        'Team members (up to 10)',
        'Custom branding',
        'Bulk creator invites',
        'ROI tracking',
        'Performance payments (CPE/CPA)'
      ],
      limits: {
        campaigns: -1, // Unlimited
        activeDeals: 20,
        teamMembers: 10,
        storage: 2000, // 2GB
        apiCalls: 20000, // per month
        analytics: true,
        api_access: true,
        priority_support: true,
        custom_branding: true
      },
      stripePriceId: {
        month: 'price_professional_monthly',
        year: 'price_professional_yearly'
      },
      metadata: {
        popular: true,
        recommended: true,
        badge: 'Most Popular',
        color: '#8B5CF6'
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 499,
      currency: 'USD',
      interval: 'month',
      description: 'For large brands and agencies',
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'Advanced security features',
        'Unlimited team members',
        'White-label solution',
        'Custom reporting',
        'Priority feature requests',
        'Bulk operations',
        'API rate limit increase',
        'Custom contract templates'
      ],
      limits: {
        campaigns: -1,
        activeDeals: -1,
        teamMembers: -1,
        storage: 10000, // 10GB
        apiCalls: 100000, // per month
        analytics: true,
        api_access: true,
        priority_support: true,
        custom_branding: true,
        white_label: true
      },
      stripePriceId: {
        month: 'price_enterprise_monthly',
        year: 'price_enterprise_yearly'
      },
      metadata: {
        popular: false,
        color: '#EC4899'
      }
    }
  ],

  // Platform commission rates
  commissions: {
    default: 10, // 10% for free/starter
    premium: 8,  // 8% for professional
    enterprise: 5 // 5% for enterprise
  },

  // Transaction fees (Stripe)
  transactionFees: {
    stripe: 2.9, // 2.9%
    stripeFixed: 0.3, // $0.30
    paypal: 3.5, // 3.5%
    paypalFixed: 0.49, // $0.49
    bank: 0 // Free for bank transfers
  },

  // Withdrawal fees
  withdrawalFees: {
    bank: 0, // Free for bank transfers
    paypal: 2, // 2%
    wire: 25, // $25 flat fee
    crypto: 1 // 1%
  },

  // Trial periods
  trialDays: 14,

  // Feature flags
  features: {
    basic_search: { free: true, starter: true, professional: true, enterprise: true },
    advanced_search: { free: false, starter: true, professional: true, enterprise: true },
    ai_matching: { free: false, starter: false, professional: true, enterprise: true },
    api_access: { free: false, starter: true, professional: true, enterprise: true },
    analytics: { free: false, starter: true, professional: true, enterprise: true },
    custom_branding: { free: false, starter: false, professional: true, enterprise: true },
    white_label: { free: false, starter: false, professional: false, enterprise: true },
    priority_support: { free: false, starter: false, professional: true, enterprise: true },
    dedicated_manager: { free: false, starter: false, professional: false, enterprise: true },
    bulk_operations: { free: false, starter: false, professional: true, enterprise: true },
    performance_payments: { free: false, starter: false, professional: true, enterprise: true },
    roi_tracking: { free: false, starter: false, professional: true, enterprise: true },
    custom_reports: { free: false, starter: false, professional: true, enterprise: true }
  },

  // Plan limits by type
  planLimits: {
    free: {
      maxCampaigns: 3,
      maxActiveDeals: 2,
      maxTeamMembers: 1,
      storageMB: 100,
      apiCallsPerMonth: 1000,
      searchResults: 50
    },
    starter: {
      maxCampaigns: 10,
      maxActiveDeals: 5,
      maxTeamMembers: 3,
      storageMB: 500,
      apiCallsPerMonth: 5000,
      searchResults: 200
    },
    professional: {
      maxCampaigns: -1,
      maxActiveDeals: 20,
      maxTeamMembers: 10,
      storageMB: 2000,
      apiCallsPerMonth: 20000,
      searchResults: 500
    },
    enterprise: {
      maxCampaigns: -1,
      maxActiveDeals: -1,
      maxTeamMembers: -1,
      storageMB: 10000,
      apiCallsPerMonth: 100000,
      searchResults: 1000
    }
  },

  // Discount codes
  discounts: {
    ANNUAL_20: {
      code: 'ANNUAL20',
      type: 'percentage',
      amount: 20,
      description: '20% off annual plans',
      validFor: ['starter', 'professional', 'enterprise']
    },
    LAUNCH_30: {
      code: 'LAUNCH30',
      type: 'percentage',
      amount: 30,
      description: '30% off first 3 months',
      validFor: ['starter', 'professional']
    },
    FRIENDS10: {
      code: 'FRIENDS10',
      type: 'percentage',
      amount: 10,
      description: '10% off for referrals',
      validFor: ['starter', 'professional', 'enterprise']
    }
  },

  // Helper function to check if feature is available
  hasFeature: (planId, feature) => {
    const plan = module.exports.plans.find(p => p.id === planId);
    if (!plan) return false;
    
    const featureMap = module.exports.features[feature];
    return featureMap ? featureMap[planId] || false : false;
  },

  // Helper function to get plan limits
  getLimits: (planId) => {
    return module.exports.planLimits[planId] || module.exports.planLimits.free;
  },

  // Helper function to calculate annual savings
  calculateAnnualSavings: (monthlyPrice) => {
    const annualPrice = monthlyPrice * 12;
    const discountedAnnual = annualPrice * 0.8; // 20% off
    return {
      monthly: monthlyPrice,
      annual: discountedAnnual,
      savings: annualPrice - discountedAnnual,
      savingsPercentage: 20
    };
  }
};