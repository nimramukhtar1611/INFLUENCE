const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const { Conversation } = require('../models/Conversation');
const Message = require('../models/Message');

const useTestDb = process.env.SEED_USE_TEST_DB === 'true' || process.env.NODE_ENV === 'test';
const mongoUri = useTestDb
  ? (process.env.MONGODB_TEST_URI || process.env.MONGODB_URI)
  : process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MongoDB URI. Set MONGODB_URI (and optionally MONGODB_TEST_URI).');
  process.exit(1);
}

const testUsers = [
  {
    email: 'test.creator@influencex.com',
    password: 'TestCreator123',
    fullName: 'Test Creator User',
    userType: 'creator',
    displayName: 'Test Creator',
    handle: 'test_creator',
    niches: ['Technology', 'Lifestyle'],
    bio: 'Professional content creator with expertise in tech reviews and lifestyle content',
    website: 'https://testcreator.com',
    location: 'New York, USA',
    languages: ['English', 'Spanish'],
    socialAccounts: [
      {
        platform: 'instagram',
        username: 'testcreator',
        followerCount: 50000,
        verified: true
      },
      {
        platform: 'youtube',
        username: 'testcreator',
        followerCount: 100000,
        verified: true
      }
    ],
    emailVerified: true,
    status: 'active',
    profilePicture: 'https://picsum.photos/seed/creator123/200/200.jpg',
    metrics: {
      avgEngagement: 4.5,
      totalPosts: 250,
      avgViews: 25000
    }
  },
  {
    email: 'test.brand@influencex.com',
    password: 'TestBrand123',
    fullName: 'Test Brand User',
    userType: 'brand',
    brandName: 'TechBrand Inc.',
    industry: 'Technology',
    website: 'https://techbrand.com',
    companySize: '50-100',
    foundedYear: 2018,
    description: 'Innovative technology company focused on consumer electronics',
    logo: 'https://picsum.photos/seed/brand123/200/200.jpg',
    emailVerified: true,
    status: 'active',
    profilePicture: 'https://picsum.photos/seed/brandlogo/200/200.jpg',
    budget: {
      monthly: 10000,
      total: 100000
    }
  }
];

async function createTestUsers() {
  console.log('Creating test users...');
  
  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️ User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user with hashed password
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created ${userData.userType}: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }
  
  // Return created users
  const creator = await User.findOne({ email: 'test.creator@influencex.com' });
  const brand = await User.findOne({ email: 'test.brand@influencex.com' });
  
  return { creator, brand };
}

async function createTestCampaign(brand) {
  console.log('Creating test campaign...');
  
  try {
    // Check if campaign already exists
    const existingCampaign = await Campaign.findOne({ title: 'Summer Tech Product Launch' });
    if (existingCampaign) {
      console.log('⚠️ Campaign already exists, skipping...');
      return existingCampaign;
    }

    const campaign = new Campaign({
      title: 'Summer Tech Product Launch',
      description: 'We are launching our new smartwatch and need creative influencers to showcase its features. The campaign focuses on fitness tracking, health monitoring, and lifestyle integration.',
      brandId: brand._id,
      category: 'Technology',
      objectives: [
        'Increase brand awareness',
        'Drive product sales',
        'Showcase product features',
        'Create engaging content'
      ],
      status: 'active',
      budget: 5000,
      spent: 0,
      budgetType: 'fixed',
      paymentTerms: 'escrow',
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      submissionDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      deliverables: [
        {
          type: 'post',
          platform: 'instagram',
          quantity: 3,
          description: 'Instagram posts showcasing smartwatch features',
          requirements: 'High-quality photos with product in use',
          budget: 1500,
          status: 'pending'
        },
        {
          type: 'reel',
          platform: 'instagram',
          quantity: 2,
          description: 'Instagram Reels demonstrating fitness tracking',
          requirements: 'Dynamic video content showing real-time usage',
          budget: 2000,
          status: 'pending'
        },
        {
          type: 'video',
          platform: 'youtube',
          quantity: 1,
          description: 'YouTube review video',
          requirements: 'In-depth review with unboxing and features demo',
          budget: 1500,
          status: 'pending'
        }
      ],
      targetAudience: {
        minFollowers: 10000,
        maxFollowers: 500000,
        minEngagement: 3,
        locations: ['United States', 'Canada', 'United Kingdom'],
        ages: ['18-24', '25-34', '35-44'],
        genders: ['all'],
        niches: ['Technology', 'Fitness', 'Lifestyle'],
        platforms: ['instagram', 'youtube']
      },
      requirements: [
        'Must have experience with tech products',
        'Professional quality content only',
        'Include brand hashtags',
        'Tag official brand accounts'
      ],
      createdBy: brand._id
    });

    await campaign.save();
    console.log('✅ Created test campaign');
    return campaign;
  } catch (error) {
    console.error('❌ Error creating campaign:', error.message);
    return null;
  }
}

async function createTestDeal(campaign, brand, creator) {
  console.log('Creating test deal...');
  
  try {
    // Check if deal already exists
    const existingDeal = await Deal.findOne({ 
      campaignId: campaign._id, 
      creatorId: creator._id 
    });
    if (existingDeal) {
      console.log('⚠️ Deal already exists, skipping...');
      return existingDeal;
    }

    const deal = new Deal({
      campaignId: campaign._id,
      brandId: brand._id,
      creatorId: creator._id,
      status: 'accepted',
      type: 'application',
      paymentStatus: 'in-escrow',
      paymentType: 'fixed',
      budget: 5000,
      platformFee: 250, // 5% platform fee
      netAmount: 4750,
      currency: 'USD',
      paymentTerms: 'escrow',
      startDate: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      progress: 0,
      deliverables: [
        {
          type: 'post',
          platform: 'instagram',
          description: 'Instagram posts showcasing smartwatch features',
          quantity: 3,
          budget: 1500,
          status: 'pending'
        },
        {
          type: 'reel',
          platform: 'instagram',
          description: 'Instagram Reels demonstrating fitness tracking',
          quantity: 2,
          budget: 2000,
          status: 'pending'
        },
        {
          type: 'video',
          platform: 'youtube',
          description: 'YouTube review video',
          quantity: 1,
          budget: 1500,
          status: 'pending'
        }
      ],
      requirements: [
        'High-quality content only',
        'Include brand hashtags #TechBrand #SmartWatch2024',
        'Tag @techbrand official account',
        'Submit content for approval before posting'
      ],
      terms: 'Payment will be released upon completion and approval of all deliverables. Content must be original and exclusive to this campaign.',
      createdBy: brand._id,
      timeline: [
        {
          event: 'deal_created',
          description: 'Deal created and sent to creator',
          userId: brand._id,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          event: 'deal_accepted',
          description: 'Creator accepted the deal',
          userId: creator._id,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
        },
        {
          event: 'payment_escrow',
          description: 'Payment placed in escrow',
          userId: brand._id,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ]
    });

    await deal.save();
    console.log('✅ Created test deal');
    return deal;
  } catch (error) {
    console.error('❌ Error creating deal:', error.message);
    return null;
  }
}

async function createTestConversation(brand, creator, deal) {
  console.log('Creating test conversation...');
  
  try {
    // Check if conversation already exists
    const existingConv = await Conversation.findOne({
      'participants.user_id': { $all: [brand._id, creator._id] },
      type: 'direct'
    });
    if (existingConv) {
      console.log('⚠️ Conversation already exists, skipping...');
      return existingConv;
    }

    const conversation = new Conversation({
      conversation_id: `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      participants: [
        {
          user_id: brand._id,
          user_type: 'brand',
          joined_at: new Date(),
          is_active: true,
          role: 'member'
        },
        {
          user_id: creator._id,
          user_type: 'creator',
          joined_at: new Date(),
          is_active: true,
          role: 'member'
        }
      ],
      participant_count: 2,
      type: 'direct',
      deal_id: deal._id,
      metadata: {
        title: 'Summer Tech Product Launch Discussion',
        is_pinned: false,
        is_archived: false
      },
      status: 'active',
      created_by: {
        user_id: brand._id,
        user_type: 'brand'
      }
    });

    await conversation.save();
    console.log('✅ Created test conversation');
    return conversation;
  } catch (error) {
    console.error('❌ Error creating conversation:', error.message);
    return null;
  }
}

async function createTestMessages(conversation, brand, creator, deal) {
  console.log('Creating test messages...');
  
  try {
    const now = new Date();
    const messages = [
      {
        conversationId: conversation._id,
        senderId: brand._id,
        content: 'Hi! I\'m excited to work with you on our Summer Tech Product Launch campaign. Your profile looks perfect for our smartwatch promotion!',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        conversationId: conversation._id,
        senderId: creator._id,
        content: 'Thank you for reaching out! I\'m very interested in this campaign. I love tech products and my audience would definitely be interested in a smartwatch. Can you share more details about the specific features you\'d like me to focus on?',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000) // 5 days ago + 4 hours
      },
      {
        conversationId: conversation._id,
        senderId: brand._id,
        content: 'Absolutely! The key features we want to highlight are: 1) Advanced fitness tracking with heart rate monitoring, 2) Sleep quality analysis, 3) Smartphone integration with notifications, and 4) Battery life of up to 7 days. We\'d love to see how you incorporate these into your daily routine.',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000) // 5 days ago + 5 hours
      },
      {
        conversationId: conversation._id,
        senderId: creator._id,
        content: 'Those sound amazing! I especially love the sleep tracking feature - that\'s something my audience has been asking about. I can create some great content around my morning routine with the watch, and maybe a week-long fitness challenge series?',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      },
      {
        conversationId: conversation._id,
        senderId: brand._id,
        content: 'That\'s perfect! A week-long fitness challenge series sounds exactly what we\'re looking for. I\'ve sent over the official deal proposal with all the details. Please review and let me know if you have any questions!',
        contentType: 'deal_offer',
        dealId: deal._id,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000) // 4 days ago + 1 hour
      },
      {
        conversationId: conversation._id,
        senderId: creator._id,
        content: 'I\'ve reviewed the deal and everything looks great! The deliverables align perfectly with my content style. I\'m ready to accept and get started!',
        contentType: 'deal_accept',
        dealId: deal._id,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) // 4 days ago + 2 hours
      },
      {
        conversationId: conversation._id,
        senderId: brand._id,
        content: 'Fantastic! Welcome to the team! I\'ve just placed the payment in escrow. You should receive confirmation shortly. Let\'s schedule a quick call this week to discuss the creative direction and timeline.',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        conversationId: conversation._id,
        senderId: creator._id,
        content: 'Perfect! I\'m available Tuesday or Thursday afternoon. Also, when should I expect to receive the product for testing? I\'d like to use it for at least a week before creating content.',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000) // 3 days ago + 1 hour
      },
      {
        conversationId: conversation._id,
        senderId: brand._id,
        content: 'Great! Tuesday at 2 PM EST works for me. We\'ll ship the product out tomorrow - you should have it by Wednesday. That gives you plenty of time to test it out. I\'ll also send over our brand guidelines and hashtag requirements.',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        conversationId: conversation._id,
        senderId: creator._id,
        content: 'Sounds like a plan! Looking forward to our call and getting started with the product. This is going to be an amazing campaign! 🚀',
        contentType: 'text',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) // 2 days ago + 2 hours
      }
    ];

    // Clear existing messages for this conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Create new messages
    const createdMessages = [];
    for (const msgData of messages) {
      const message = new Message(msgData);
      await message.save();
      createdMessages.push(message);
    }

    console.log(`✅ Created ${createdMessages.length} test messages`);
    return createdMessages;
  } catch (error) {
    console.error('❌ Error creating messages:', error.message);
    return [];
  }
}

async function updateConversationLastMessage(conversation) {
  try {
    const lastMessage = await Message.findOne({ conversationId: conversation._id })
      .sort({ createdAt: -1 });

    if (lastMessage) {
      conversation.last_message = {
        message_id: lastMessage._id,
        content: lastMessage.content.substring(0, 100),
        sender_id: lastMessage.senderId,
        created_at: lastMessage.createdAt,
        type: lastMessage.contentType
      };
      conversation.message_count = await Message.countDocuments({ conversationId: conversation._id });
      await conversation.save();
    }
  } catch (error) {
    console.error('❌ Error updating conversation:', error.message);
  }
}

async function run() {
  console.log('🌱 Seeding complete test environment...');
  console.log(`Database: ${useTestDb ? 'TEST' : 'DEFAULT'} (${mongoUri})`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

    // Create test users
    const { creator, brand } = await createTestUsers();

    if (!creator || !brand) {
      throw new Error('Failed to create test users');
    }

    // Create test campaign
    const campaign = await createTestCampaign(brand);
    if (!campaign) {
      throw new Error('Failed to create test campaign');
    }

    // Create test deal
    const deal = await createTestDeal(campaign, brand, creator);
    if (!deal) {
      throw new Error('Failed to create test deal');
    }

    // Create test conversation
    const conversation = await createTestConversation(brand, creator, deal);
    if (!conversation) {
      throw new Error('Failed to create test conversation');
    }

    // Create test messages
    const messages = await createTestMessages(conversation, brand, creator, deal);
    
    // Update conversation with last message
    await updateConversationLastMessage(conversation);

    console.log('');
    console.log('🎉 Test environment seeding completed successfully!');
    console.log('');
    console.log('📧 Test Users Created:');
    console.log('  Creator: test.creator@influencex.com / TestCreator123');
    console.log('  Brand:   test.brand@influencex.com / TestBrand123');
    console.log('');
    console.log('📊 Campaign Created:');
    console.log(`  Title: ${campaign.title}`);
    console.log(`  Budget: $${campaign.budget}`);
    console.log(`  Status: ${campaign.status}`);
    console.log('');
    console.log('🤝 Deal Created:');
    console.log(`  Status: ${deal.status}`);
    console.log(`  Budget: $${deal.budget}`);
    console.log(`  Payment: ${deal.paymentStatus}`);
    console.log('');
    console.log('💬 Chat Created:');
    console.log(`  Messages: ${messages.length}`);
    console.log(`  Conversation ID: ${conversation.conversation_id}`);
    console.log('');
    console.log('✨ All test data is properly connected and ready for testing!');

  } catch (error) {
    console.error('❌ Test seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
