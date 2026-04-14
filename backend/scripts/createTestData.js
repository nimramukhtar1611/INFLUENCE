// scripts/createTestData.js - Create test brand, creator, and campaign deal
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');

// Test data
const testBrandData = {
  email: 'testbrand@influence.com',
  password: 'password123',
  userType: 'brand',
  fullName: 'Test Brand Company',
  phone: '+1234567890',
  brandName: 'TechStyle Fashion',
  industry: 'Fashion',
  website: 'https://techstylefashion.com',
  description: 'A modern fashion brand focused on sustainable and tech-integrated clothing',
  founded: '2020',
  employees: '51-200',
  companySize: '51-200',
  businessType: 'corporation',
  address: {
    street: '123 Fashion Ave',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zipCode: '10001'
  },
  socialMedia: {
    instagram: 'techstylefashion',
    twitter: 'techstyle_offic',
    facebook: 'techstylefashion',
    linkedin: 'techstyle-fashion'
  },
  status: 'active',
  emailVerified: true,
  isVerified: true
};

const testCreatorData = {
  email: 'testcreator@influence.com',
  password: 'password123',
  userType: 'creator',
  fullName: 'Sarah Johnson',
  phone: '+1234567891',
  displayName: 'SarahStyle',
  handle: 'sarahstyle',
  bio: 'Fashion and lifestyle influencer passionate about sustainable fashion',
  location: 'Los Angeles, CA',
  website: 'https://sarahstyle.com',
  gender: 'female',
  niches: ['Fashion', 'Lifestyle', 'Beauty'],
  primaryPlatform: 'instagram',
  socialMedia: {
    instagram: {
      handle: 'sarahstyle',
      url: 'https://instagram.com/sarahstyle',
      followers: 50000,
      following: 1200,
      posts: 850,
      engagement: 4.5,
      verified: false,
      isBusiness: true
    },
    tiktok: {
      handle: 'sarahstyle',
      url: 'https://tiktok.com/@sarahstyle',
      followers: 25000,
      following: 800,
      likes: 500000,
      videos: 200,
      engagement: 6.2,
      verified: false
    },
    youtube: {
      handle: 'SarahStyle',
      url: 'https://youtube.com/c/SarahStyle',
      subscribers: 15000,
      views: 2000000,
      videos: 120,
      engagement: 3.8,
      verified: false
    }
  },
  rateCard: {
    instagram: {
      post: 500,
      story: 200,
      reel: 400,
      carousel: 600
    },
    tiktok: {
      video: 300,
      challenge: 800
    },
    youtube: {
      video: 1000,
      shorts: 200
    }
  },
  audienceDemographics: {
    ageGroups: {
      '18-24': 25,
      '25-34': 45,
      '35-44': 20,
      '45+': 10
    },
    gender: {
      male: 20,
      female: 75,
      other: 5
    },
    topCountries: [
      { country: 'United States', percentage: 60 },
      { country: 'Canada', percentage: 15 },
      { country: 'United Kingdom', percentage: 10 },
      { country: 'Australia', percentage: 8 },
      { country: 'Germany', percentage: 7 }
    ]
  },
  status: 'active',
  emailVerified: true,
  isVerified: true
};

const testCampaignData = {
  title: 'Summer Fashion Collection 2024',
  description: 'Looking for creative fashion influencers to showcase our new summer collection featuring sustainable fabrics and bold designs. We want authentic content that highlights the quality and style of our pieces.',
  category: 'Fashion',
  objectives: [
    'Increase brand awareness',
    'Drive traffic to website',
    'Showcase new summer collection',
    'Promote sustainability message'
  ],
  budget: 5000,
  budgetType: 'fixed',
  paymentTerms: 'escrow',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  submissionDeadline: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days from now
  targetAudience: {
    minFollowers: 10000,
    maxFollowers: 200000,
    minEngagement: 2,
    locations: ['United States', 'Canada', 'United Kingdom'],
    ages: ['18-24', '25-34', '35-44'],
    genders: ['female', 'all'],
    niches: ['Fashion', 'Lifestyle', 'Beauty'],
    platforms: ['instagram', 'tiktok']
  },
  requirements: [
    'Must feature at least 3 different outfits',
    'Include sustainable fashion messaging',
    'Tag brand and use campaign hashtag',
    'High-quality photos/videos required',
    'Include link to product page in bio'
  ],
  deliverables: [
    {
      type: 'post',
      platform: 'instagram',
      quantity: 3,
      description: 'Instagram posts featuring different outfits',
      requirements: 'High-quality photos with brand tags',
      budget: 1500
    },
    {
      type: 'reel',
      platform: 'instagram',
      quantity: 2,
      description: 'Instagram reels showing outfit transitions',
      requirements: 'Creative transitions with trending audio',
      budget: 1000
    },
    {
      type: 'video',
      platform: 'tiktok',
      quantity: 3,
      description: 'TikTok videos showcasing summer collection',
      requirements: 'Trending format with brand hashtag',
      budget: 1200
    }
  ],
  status: 'active'
};

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influence', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clean up existing test data
    await User.deleteMany({ email: { $in: [testBrandData.email, testCreatorData.email] } });
    console.log('Cleaned up existing test users');

    // Create test brand user
    const brandUser = new Brand(testBrandData);
    await brandUser.save();
    console.log('✅ Test brand user created:', {
      id: brandUser._id,
      email: brandUser.email,
      brandName: brandUser.brandName,
      userType: brandUser.userType
    });

    // Create test creator user
    const creatorUser = new Creator(testCreatorData);
    await creatorUser.save();
    console.log('✅ Test creator user created:', {
      id: creatorUser._id,
      email: creatorUser.email,
      displayName: creatorUser.displayName,
      handle: creatorUser.handle,
      userType: creatorUser.userType,
      totalFollowers: creatorUser.totalFollowers
    });

    // Create test campaign
    const campaignData = {
      ...testCampaignData,
      brandId: brandUser._id,
      createdBy: brandUser._id
    };
    
    const campaign = new Campaign(campaignData);
    await campaign.save();
    console.log('✅ Test campaign created:', {
      id: campaign._id,
      title: campaign.title,
      brandId: campaign.brandId,
      budget: campaign.budget,
      status: campaign.status
    });

    // Create test deal between brand and creator
    const dealData = {
      campaignId: campaign._id,
      brandId: brandUser._id,
      creatorId: creatorUser._id,
      status: 'pending',
      type: 'direct',
      paymentTerms: 'escrow',
      budget: 3700, // Sum of deliverables
      deliverables: [
        {
          type: 'post',
          platform: 'instagram',
          quantity: 3,
          description: 'Instagram posts featuring different outfits',
          requirements: 'High-quality photos with brand tags',
          budget: 1500,
          status: 'pending'
        },
        {
          type: 'reel',
          platform: 'instagram',
          quantity: 2,
          description: 'Instagram reels showing outfit transitions',
          requirements: 'Creative transitions with trending audio',
          budget: 1000,
          status: 'pending'
        },
        {
          type: 'video',
          platform: 'tiktok',
          quantity: 3,
          description: 'TikTok videos showcasing summer collection',
          requirements: 'Trending format with brand hashtag',
          budget: 1200,
          status: 'pending'
        }
      ],
      deadline: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days from now
      requirements: [
        'Must feature at least 3 different outfits',
        'Include sustainable fashion messaging',
        'Tag brand and use campaign hashtag',
        'High-quality photos/videos required',
        'Include link to product page in bio'
      ],
      terms: 'Content must be authentic and align with brand values. All content must be submitted for approval before posting.',
      createdBy: brandUser._id
    };

    const deal = new Deal(dealData);
    await deal.save();
    console.log('✅ Test deal created:', {
      id: deal._id,
      campaignId: deal.campaignId,
      brandId: deal.brandId,
      creatorId: deal.creatorId,
      status: deal.status,
      budget: deal.budget,
      deadline: deal.deadline
    });

    // Add creator to campaign's selected creators
    campaign.selectedCreators.push({
      creatorId: creatorUser._id,
      dealId: deal._id,
      status: 'pending'
    });
    await campaign.save();

    // Add deal to brand's stats
    brandUser.stats.totalCampaigns += 1;
    brandUser.stats.totalSpent += deal.budget;
    await brandUser.save();

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('========================');
    console.log('Brand Login:');
    console.log('  Email:', testBrandData.email);
    console.log('  Password:', testBrandData.password);
    console.log('  Brand Name:', testBrandData.brandName);
    console.log('');
    console.log('Creator Login:');
    console.log('  Email:', testCreatorData.email);
    console.log('  Password:', testCreatorData.password);
    console.log('  Display Name:', testCreatorData.displayName);
    console.log('  Handle:', testCreatorData.handle);
    console.log('');
    console.log('📊 Campaign & Deal:');
    console.log('  Campaign:', campaign.title);
    console.log('  Budget:', campaign.budget);
    console.log('  Deal Status:', deal.status, '(pending creator acceptance)');
    console.log('  Deal ID:', deal._id);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createTestData();
}

module.exports = createTestData;
