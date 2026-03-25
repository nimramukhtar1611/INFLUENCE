const Joi = require('joi');

// User validation schemas
const userValidation = {
  // Register validation
  register: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      }),
    
    fullName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s]+$/)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters',
        'string.max': 'Full name cannot exceed 50 characters',
        'string.pattern.base': 'Full name can only contain letters and spaces',
        'any.required': 'Full name is required'
      }),
    
    userType: Joi.string()
      .valid('brand', 'creator')
      .required()
      .messages({
        'any.only': 'User type must be either brand or creator',
        'any.required': 'User type is required'
      }),
    
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number'
      }),
    
    // Brand specific fields
    brandName: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().min(2).max(100).required(),
      otherwise: Joi.optional()
    }),
    
    industry: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().valid(
        'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 
        'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'
      ).required(),
      otherwise: Joi.optional()
    }),
    
    website: Joi.when('userType', {
      is: 'brand',
      then: Joi.string().uri().optional(),
      otherwise: Joi.optional()
    }),
    
    // Creator specific fields
    displayName: Joi.when('userType', {
      is: 'creator',
      then: Joi.string().min(2).max(50).required(),
      otherwise: Joi.optional()
    }),
    
    handle: Joi.when('userType', {
      is: 'creator',
      then: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
          'string.pattern.base': 'Handle can only contain letters, numbers, and underscores'
        }),
      otherwise: Joi.optional()
    }),
    
    niches: Joi.when('userType', {
      is: 'creator',
      then: Joi.array()
        .items(Joi.string().valid(
          'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 
          'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance'
        ))
        .min(1)
        .max(5)
        .optional(),
      otherwise: Joi.optional()
    })
  }),

  // Login validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    userType: Joi.string().valid('brand', 'creator').required()
  }),

  // Update profile validation
  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    profilePicture: Joi.string().uri().optional(),
    coverPicture: Joi.string().uri().optional(),
    
    // Settings
    settings: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de', 'ar').optional(),
      timezone: Joi.string().optional(),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        sms: Joi.boolean()
      }).optional(),
      privacy: Joi.object({
        showEmail: Joi.boolean(),
        showPhone: Joi.boolean(),
        showLocation: Joi.boolean()
      }).optional()
    }).optional()
  })
};

// Brand validation schemas
const brandValidation = {
  // Update brand profile
  updateProfile: Joi.object({
    brandName: Joi.string().min(2).max(100).optional(),
    industry: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'
    ).optional(),
    website: Joi.string().uri().optional(),
    description: Joi.string().max(500).optional(),
    founded: Joi.string().pattern(/^\d{4}$/).optional(),
    employees: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    
    socialMedia: Joi.object({
      instagram: Joi.string().uri().optional(),
      twitter: Joi.string().uri().optional(),
      facebook: Joi.string().uri().optional(),
      linkedin: Joi.string().uri().optional(),
      youtube: Joi.string().uri().optional(),
      tiktok: Joi.string().uri().optional()
    }).optional(),
    
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    
    preferences: Joi.object({
      preferredNiches: Joi.array().items(Joi.string()).optional(),
      preferredPlatforms: Joi.array().items(Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter')).optional(),
      minFollowers: Joi.number().min(0).optional(),
      maxFollowers: Joi.number().min(0).optional(),
      minEngagement: Joi.number().min(0).max(100).optional()
    }).optional()
  }),

  // Add team member
  addTeamMember: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    role: Joi.string().valid('admin', 'manager', 'member').required(),
    permissions: Joi.array().items(Joi.string()).optional()
  })
};

// Creator validation schemas
const creatorValidation = {
  // Update creator profile
  updateProfile: Joi.object({
    displayName: Joi.string().min(2).max(50).optional(),
    handle: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .optional(),
    bio: Joi.string().max(500).optional(),
    location: Joi.string().max(100).optional(),
    website: Joi.string().uri().optional(),
    birthday: Joi.date().max('now').optional(),
    gender: Joi.string().valid('male', 'female', 'non-binary', 'prefer-not').optional(),
    niches: Joi.array().items(Joi.string()).min(1).max(5).optional(),
    
    socialMedia: Joi.object({
      instagram: Joi.object({
        handle: Joi.string().optional(),
        url: Joi.string().uri().optional(),
        followers: Joi.number().min(0).optional()
      }).optional(),
      youtube: Joi.object({
        handle: Joi.string().optional(),
        url: Joi.string().uri().optional(),
        subscribers: Joi.number().min(0).optional()
      }).optional(),
      tiktok: Joi.object({
        handle: Joi.string().optional(),
        url: Joi.string().uri().optional(),
        followers: Joi.number().min(0).optional()
      }).optional()
    }).optional(),
    
    rateCard: Joi.object({
      instagram: Joi.object({
        post: Joi.number().min(0).optional(),
        story: Joi.number().min(0).optional(),
        reel: Joi.number().min(0).optional()
      }).optional(),
      youtube: Joi.object({
        video: Joi.number().min(0).optional(),
        shorts: Joi.number().min(0).optional()
      }).optional(),
      tiktok: Joi.object({
        video: Joi.number().min(0).optional(),
        challenge: Joi.number().min(0).optional()
      }).optional()
    }).optional(),
    
    availability: Joi.object({
      status: Joi.string().valid('available', 'busy', 'unavailable').optional(),
      nextAvailable: Joi.date().optional(),
      maxActiveDeals: Joi.number().min(1).max(20).optional()
    }).optional()
  }),

  // Add portfolio item
  addPortfolio: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    mediaUrl: Joi.string().uri().required(),
    thumbnail: Joi.string().uri().optional(),
    platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'other').required(),
    brand: Joi.string().optional(),
    campaign: Joi.string().optional(),
    performance: Joi.object({
      views: Joi.number().min(0).optional(),
      likes: Joi.number().min(0).optional(),
      comments: Joi.number().min(0).optional(),
      shares: Joi.number().min(0).optional()
    }).optional()
  })
};

// Campaign validation schemas
const campaignValidation = {
  // Create campaign
  create: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(20).max(2000).required(),
    objectives: Joi.array().items(Joi.string()).min(1).required(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'
    ).required(),
    
    deliverables: Joi.array().items(Joi.object({
      type: Joi.string().valid('post', 'story', 'reel', 'video', 'blog', 'review', 'other').required(),
      platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other').required(),
      quantity: Joi.number().min(1).max(100).required(),
      description: Joi.string().max(500).optional(),
      requirements: Joi.string().max(1000).optional(),
      budget: Joi.number().min(0).optional()
    })).min(1).required(),
    
    budget: Joi.number().min(10).max(1000000).required(),
    budgetType: Joi.string().valid('fixed', 'outcome-based').default('fixed'),
    paymentTerms: Joi.string().valid('escrow', 'half', 'full').default('escrow'),
    
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    
    targetAudience: Joi.object({
      minFollowers: Joi.number().min(0).optional(),
      maxFollowers: Joi.number().min(0).optional(),
      minEngagement: Joi.number().min(0).max(100).optional(),
      locations: Joi.array().items(Joi.string()).optional(),
      ages: Joi.array().items(Joi.string().valid('18-24', '25-34', '35-44', '45+')).optional(),
      genders: Joi.array().items(Joi.string().valid('male', 'female', 'all')).optional(),
      niches: Joi.array().items(Joi.string()).optional(),
      platforms: Joi.array().items(Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter')).optional()
    }).optional(),
    
    requirements: Joi.array().items(Joi.string()).optional(),
    brandAssets: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      fileUrl: Joi.string().uri().required(),
      fileType: Joi.string().valid('image', 'video', 'document').required()
    })).optional()
  }),

  // Update campaign
  update: Joi.object({
    title: Joi.string().min(5).max(100).optional(),
    description: Joi.string().min(20).max(2000).optional(),
    objectives: Joi.array().items(Joi.string()).optional(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'
    ).optional(),
    deliverables: Joi.array().items(Joi.object({
      type: Joi.string().valid('post', 'story', 'reel', 'video', 'blog', 'review', 'other'),
      platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other'),
      quantity: Joi.number().min(1).max(100),
      description: Joi.string().max(500).optional(),
      requirements: Joi.string().max(1000).optional(),
      budget: Joi.number().min(0).optional()
    })).optional(),
    budget: Joi.number().min(10).max(1000000).optional(),
    targetAudience: Joi.object({
      minFollowers: Joi.number().min(0),
      maxFollowers: Joi.number().min(0),
      minEngagement: Joi.number().min(0).max(100),
      locations: Joi.array().items(Joi.string()),
      ages: Joi.array().items(Joi.string().valid('18-24', '25-34', '35-44', '45+')),
      genders: Joi.array().items(Joi.string().valid('male', 'female', 'all')),
      niches: Joi.array().items(Joi.string()),
      platforms: Joi.array().items(Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter'))
    }).optional()
  })
};

// Deal validation schemas
const dealValidation = {
  // Create deal
  create: Joi.object({
    campaignId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    creatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    budget: Joi.number().min(10).max(1000000).required(),
    deadline: Joi.date().greater('now').required(),
    deliverables: Joi.array().items(Joi.object({
      type: Joi.string().valid('post', 'story', 'reel', 'video', 'blog', 'review').required(),
      platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter', 'facebook').required(),
      description: Joi.string().max(500).optional(),
      quantity: Joi.number().min(1).max(100).default(1)
    })).min(1).required(),
    terms: Joi.string().max(2000).optional(),
    paymentTerms: Joi.string().valid('escrow', 'half', 'full').default('escrow')
  }),

  // Counter offer
  counterOffer: Joi.object({
    budget: Joi.number().min(10).max(1000000).required(),
    deadline: Joi.date().greater('now').required(),
    message: Joi.string().max(500).optional()
  }),

  // Revision request
  revision: Joi.object({
    notes: Joi.string().min(10).max(1000).required()
  })
};

// Payment validation schemas
const paymentValidation = {
  // Create escrow
  escrow: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // Add payment method
  addPaymentMethod: Joi.object({
    type: Joi.string().valid('credit_card', 'bank_account', 'paypal').required(),
    // Credit card fields
    cardNumber: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string().pattern(/^\d{16}$/).required(),
      otherwise: Joi.optional()
    }),
    expiryMonth: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number().min(1).max(12).required(),
      otherwise: Joi.optional()
    }),
    expiryYear: Joi.when('type', {
      is: 'credit_card',
      then: Joi.number().min(new Date().getFullYear()).required(),
      otherwise: Joi.optional()
    }),
    cvv: Joi.when('type', {
      is: 'credit_card',
      then: Joi.string().pattern(/^\d{3,4}$/).required(),
      otherwise: Joi.optional()
    }),
    // Bank account fields
    bankName: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    accountNumber: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().pattern(/^\d{8,17}$/).required(),
      otherwise: Joi.optional()
    }),
    routingNumber: Joi.when('type', {
      is: 'bank_account',
      then: Joi.string().pattern(/^\d{9}$/).required(),
      otherwise: Joi.optional()
    }),
    // PayPal fields
    paypalEmail: Joi.when('type', {
      is: 'paypal',
      then: Joi.string().email().required(),
      otherwise: Joi.optional()
    })
  }),

  // Withdrawal request
  withdrawal: Joi.object({
    amount: Joi.number().min(50).max(100000).required(),
    methodId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })
};

// Search validation
const searchValidation = {
  // Search creators
  creators: Joi.object({
    q: Joi.string().max(100).optional(),
    niche: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional(),
    minFollowers: Joi.number().min(0).optional(),
    maxFollowers: Joi.number().min(0).optional(),
    minEngagement: Joi.number().min(0).max(100).optional(),
    platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter').optional(),
    location: Joi.string().optional(),
    verified: Joi.boolean().optional(),
    available: Joi.boolean().optional(),
    sort: Joi.string().valid(
      'relevance', 'followers_desc', 'followers_asc', 
      'engagement_desc', 'engagement_asc', 'newest'
    ).default('relevance'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  }),

  // Search campaigns
  campaigns: Joi.object({
    q: Joi.string().max(100).optional(),
    category: Joi.string().valid(
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 
      'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Other'
    ).optional(),
    minBudget: Joi.number().min(0).optional(),
    maxBudget: Joi.number().min(0).optional(),
    platform: Joi.string().valid('instagram', 'youtube', 'tiktok', 'twitter').optional(),
    status: Joi.string().valid('active', 'completed', 'draft').default('active'),
    sort: Joi.string().valid('newest', 'budget_desc', 'budget_asc', 'deadline_asc').default('newest'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

// Message validation
const messageValidation = {
  // Send message
  send: Joi.object({
    content: Joi.string().max(5000).optional(),
    attachments: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      type: Joi.string().valid('image', 'video', 'document', 'audio').required(),
      filename: Joi.string().optional(),
      size: Joi.number().max(100 * 1024 * 1024).optional(),
      thumbnail: Joi.string().uri().optional()
    })).max(10).optional(),
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    repliedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    contentType: Joi.string().valid('text', 'image', 'video', 'file', 'deal_offer', 'payment').default('text')
  }).or('content', 'attachments'),

  // Add reaction
  reaction: Joi.object({
    reaction: Joi.string().valid('👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉').required()
  })
};

// Review validation
const reviewValidation = {
  // Create review
  create: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().max(100).optional(),
    content: Joi.string().min(10).max(500).required(),
    pros: Joi.array().items(Joi.string()).max(5).optional(),
    cons: Joi.array().items(Joi.string()).max(5).optional(),
    criteria: Joi.object({
      communication: Joi.number().min(1).max(5).optional(),
      quality: Joi.number().min(1).max(5).optional(),
      timeliness: Joi.number().min(1).max(5).optional(),
      professionalism: Joi.number().min(1).max(5).optional(),
      value: Joi.number().min(1).max(5).optional()
    }).optional()
  })
};

// Dispute validation
const disputeValidation = {
  // Create dispute
  create: Joi.object({
    dealId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('deliverables', 'payment', 'contract', 'communication', 'other').required(),
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(20).max(2000).required(),
    evidence: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      description: Joi.string().max(500).optional()
    })).max(10).optional()
  }),

  // Add message
  message: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    attachments: Joi.array().items(Joi.string().uri()).max(5).optional(),
    isInternal: Joi.boolean().default(false)
  }),

  // Update status (admin)
  updateStatus: Joi.object({
    status: Joi.string().valid('open', 'in-progress', 'resolved', 'closed', 'escalated').required(),
    notes: Joi.string().max(500).optional()
  })
};

// Admin validation
const adminValidation = {
  // Update user
  updateUser: Joi.object({
    fullName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending').optional(),
    isVerified: Joi.boolean().optional(),
    notes: Joi.string().max(500).optional(),
    role: Joi.string().valid('admin', 'moderator').optional()
  }),

  // Suspend user
  suspendUser: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
    duration: Joi.number().min(1).max(365).optional() // days
  }),

  // Moderation actions
  moderation: Joi.object({
    reason: Joi.string().min(10).max(500).when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    notes: Joi.string().max(500).optional()
  })
};

module.exports = {
  userValidation,
  brandValidation,
  creatorValidation,
  campaignValidation,
  dealValidation,
  paymentValidation,
  searchValidation,
  messageValidation,
  reviewValidation,
  disputeValidation,
  adminValidation
};