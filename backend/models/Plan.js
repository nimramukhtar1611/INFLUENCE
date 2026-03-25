const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  interval: {
    type: String,
    enum: ['month', 'year'],
    default: 'month'
  },
  intervalCount: {
    type: Number,
    default: 1,
    min: 1
  },
  stripeProductId: {
    type: String,
    default: null
  },
  stripePriceId: {
    month: { type: String, default: null },
    year: { type: String, default: null }
  },
  features: [String],
  limits: {
    campaigns: { type: Number, default: -1 },
    activeDeals: { type: Number, default: -1 },
    teamMembers: { type: Number, default: -1 },
    storage: { type: Number, default: -1 },
    apiCalls: { type: Number, default: -1 },
    analytics: { type: Boolean, default: false },
    api_access: { type: Boolean, default: false },
    priority_support: { type: Boolean, default: false }
  },
  metadata: {
    popular: { type: Boolean, default: false },
    color: { type: String, default: '#4F46E5' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ FIXED initializeDefaults method - with try/catch and no throw
planSchema.statics.initializeDefaults = async function() {
  try {
    console.log('📦 Initializing default plans...');
    
    const defaultPlans = [
      {
        planId: 'free',
        name: 'Free',
        price: 0,
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
          storage: 100,
          apiCalls: 1000,
          analytics: false,
          api_access: false,
          priority_support: false
        },
        metadata: {
          popular: false,
          color: '#6B7280'
        }
      },
      {
        planId: 'starter',
        name: 'Starter',
        price: 49,
        description: 'For growing brands',
        features: [
          'Up to 10 campaigns',
          'Advanced creator search',
          'Priority email support',
          'Custom contracts',
          'Advanced analytics',
          'Basic API access',
          'Team members (up to 3)'
        ],
        limits: {
          campaigns: 10,
          activeDeals: 5,
          teamMembers: 3,
          storage: 500,
          apiCalls: 5000,
          analytics: true,
          api_access: true,
          priority_support: false
        },
        metadata: {
          popular: false,
          color: '#3B82F6'
        }
      },
      {
        planId: 'professional',
        name: 'Professional',
        price: 149,
        description: 'For serious marketers',
        features: [
          'Unlimited campaigns',
          'AI-powered creator matching',
          '24/7 priority support',
          'Advanced contracts with e-sign',
          'Real-time analytics',
          'Full API access',
          'Team members (up to 10)',
          'Custom branding'
        ],
        limits: {
          campaigns: -1,
          activeDeals: 20,
          teamMembers: 10,
          storage: 2000,
          apiCalls: 20000,
          analytics: true,
          api_access: true,
          priority_support: true
        },
        metadata: {
          popular: true,
          color: '#8B5CF6'
        }
      },
      {
        planId: 'enterprise',
        name: 'Enterprise',
        price: 499,
        description: 'For large organizations',
        features: [
          'Everything in Professional',
          'Dedicated account manager',
          'Custom integrations',
          'SLA guarantee',
          'Advanced security features',
          'Unlimited team members',
          'White-label solution',
          'Custom reporting'
        ],
        limits: {
          campaigns: -1,
          activeDeals: -1,
          teamMembers: -1,
          storage: 10000,
          apiCalls: 100000,
          analytics: true,
          api_access: true,
          priority_support: true,
          custom_branding: true,
          white_label: true
        },
        metadata: {
          popular: false,
          color: '#EC4899'
        }
      }
    ];

    for (const planData of defaultPlans) {
      try {
        await this.findOneAndUpdate(
          { planId: planData.planId },
          planData,
          { upsert: true, new: true }
        );
        console.log(`  ✅ Plan ${planData.name} initialized`);
      } catch (err) {
        console.log(`  ⚠️ Error initializing ${planData.name}:`, err.message);
      }
    }

    console.log('✅ Default subscription plans initialized');
    return { success: true, count: defaultPlans.length };
  } catch (error) {
    console.error('❌ Error in initializeDefaults:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ Add this method to check if plans exist
planSchema.statics.checkPlans = async function() {
  try {
    const count = await this.countDocuments();
    console.log(`📊 Total plans in database: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Error checking plans:', error.message);
    return 0;
  }
};

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;