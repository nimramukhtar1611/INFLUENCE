// scripts/testDealAcceptance.js - Test deal acceptance flow from creator side
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');

async function testDealAcceptance() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influence', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // Find the test deal
    const deal = await Deal.findOne({ status: 'pending' })
      .populate('brandId', 'brandName email')
      .populate('creatorId', 'displayName email handle')
      .populate('campaignId', 'title description');

    if (!deal) {
      console.log('❌ No pending deals found. Please run createTestData.js first.');
      return;
    }

    console.log('📋 Found Pending Deal:');
    console.log('========================');
    console.log('Deal ID:', deal._id);
    console.log('Campaign:', deal.campaignId?.title);
    console.log('Brand:', deal.brandId?.brandName);
    console.log('Creator:', deal.creatorId?.displayName + ' (@' + deal.creatorId?.handle + ')');
    console.log('Status:', deal.status);
    console.log('Budget: $' + deal.budget);
    console.log('Deadline:', deal.deadline.toLocaleDateString());
    console.log('Deliverables:', deal.deliverables.length);
    console.log('');

    // Test deal acceptance
    console.log('🔄 Testing Deal Acceptance Flow:');
    console.log('==================================');

    // Step 1: Check if deal can be accepted
    const canAccept = deal.canTransitionTo('accepted');
    console.log('1. Can transition to accepted:', canAccept);

    if (!canAccept) {
      console.log('❌ Deal cannot be accepted from current status:', deal.status);
      return;
    }

    // Step 2: Accept the deal
    console.log('2. Accepting deal...');
    deal.status = 'accepted';
    deal.startDate = new Date();
    
    // Add timeline event
    await deal.addTimelineEvent(
      'deal_accepted',
      'Creator accepted the deal',
      deal.creatorId._id,
      { acceptedAt: new Date() }
    );

    await deal.save();
    console.log('✅ Deal accepted successfully!');

    // Step 3: Update campaign selected creators
    const campaign = await Campaign.findById(deal.campaignId);
    const selectedCreator = campaign.selectedCreators.find(
      sc => sc.creatorId.toString() === deal.creatorId._id.toString()
    );
    
    if (selectedCreator) {
      selectedCreator.status = 'active';
      await campaign.save();
      console.log('✅ Campaign updated - creator marked as active');
    }

    // Step 4: Update creator stats
    const creator = await Creator.findById(deal.creatorId._id);
    creator.stats.totalCampaigns += 1;
    await creator.save();
    console.log('✅ Creator stats updated');

    // Step 5: Create notification (this would normally be handled by a service)
    console.log('✅ Notification would be sent to brand');

    // Step 6: Verify the deal state
    const updatedDeal = await Deal.findById(deal._id)
      .populate('brandId', 'brandName email')
      .populate('creatorId', 'displayName email handle')
      .populate('campaignId', 'title');

    console.log('\n📊 Updated Deal Status:');
    console.log('========================');
    console.log('Deal ID:', updatedDeal._id);
    console.log('Status:', updatedDeal.status);
    console.log('Start Date:', updatedDeal.startDate?.toLocaleDateString());
    console.log('Payment Status:', updatedDeal.paymentStatus);
    console.log('Progress:', updatedDeal.progress + '%');
    console.log('Timeline Events:', updatedDeal.timeline.length);

    console.log('\n🎉 Deal acceptance flow completed successfully!');
    console.log('\n📱 Next Steps:');
    console.log('- Creator can now start working on deliverables');
    console.log('- Brand should fund the escrow payment');
    console.log('- Both parties can communicate via the messaging system');
    console.log('- Creator can submit deliverables for review');

  } catch (error) {
    console.error('❌ Error testing deal acceptance:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Test deal rejection as well
async function testDealRejection() {
  try {
    console.log('\n🔄 Testing Deal Rejection Flow:');
    console.log('=================================');

    // Find another pending deal or create a test scenario
    const deal = await Deal.findOne({ status: 'pending' })
      .populate('brandId', 'brandName email')
      .populate('creatorId', 'displayName email handle')
      .populate('campaignId', 'title');

    if (!deal) {
      console.log('ℹ️  No pending deals available for rejection test');
      return;
    }

    // Test deal rejection
    const canReject = deal.canTransitionTo('declined');
    console.log('1. Can transition to declined:', canReject);

    if (canReject) {
      deal.status = 'declined';
      await deal.addTimelineEvent(
        'deal_declined',
        'Creator declined the deal',
        deal.creatorId._id,
        { declinedAt: new Date() }
      );
      await deal.save();
      console.log('✅ Deal rejected successfully!');
    }

  } catch (error) {
    console.error('❌ Error testing deal rejection:', error);
  }
}

// Run the tests
async function runTests() {
  await testDealAcceptance();
  await testDealRejection();
}

if (require.main === module) {
  runTests();
}

module.exports = { testDealAcceptance, testDealRejection };
