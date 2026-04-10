#!/usr/bin/env node

// Production Seed Data Execution Script
// Usage: node run-seed.js [options]

const { program } = require('commander');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import seed functions
const {
  seedAll,
  seedBrandUser,
  seedCreatorUser,
  seedCampaigns,
  seedDeals,
  seedPayments,
  seedNotifications,
  seedActivityLogs,
  seedAnalytics,
  seedSocialAccounts,
  seedConversations
} = require('./production-seed-data');

program
  .name('run-seed')
  .description('Production seed data script for MERN Influence Platform')
  .version('1.0.0');

program
  .command('all')
  .description('Seed all production data')
  .option('-c, --clear', 'Clear existing data before seeding')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log('=== MERN INFLUENCE PLATFORM - PRODUCTION SEED ===\n');
      
      if (options.clear) {
        console.log('WARNING: This will clear all existing data from the database.');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      await seedAll();
      
      console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
      console.log('You can now log in with the provided credentials.');
      
    } catch (error) {
      console.error('Seeding failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('users')
  .description('Seed only brand and creator users')
  .option('-c, --clear', 'Clear existing users before seeding')
  .action(async (options) => {
    try {
      console.log('Seeding users only...');
      
      if (options.clear) {
        await mongoose.connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropCollection('users').catch(() => {});
        await mongoose.connection.db.dropCollection('brands').catch(() => {});
        await mongoose.connection.db.dropCollection('creators').catch(() => {});
        await mongoose.disconnect();
      }
      
      const { brand } = await seedBrandUser();
      const { creator } = await seedCreatorUser();
      
      console.log('Users seeded successfully');
      console.log(`Brand: ${brand.brandName} (${brand.email})`);
      console.log(`Creator: ${creator.displayName} (${creator.email})`);
      
    } catch (error) {
      console.error('User seeding failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('campaigns')
  .description('Seed campaigns only (requires existing brand user)')
  .option('-b, --brand <email>', 'Brand user email', 'sarah.chen@techcorp.io')
  .action(async (options) => {
    try {
      console.log('Seeding campaigns only...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      const User = require('../models/User');
      const Brand = require('../models/Brand');
      
      const brandUser = await User.findOne({ email: options.brand, userType: 'brand' });
      if (!brandUser) {
        throw new Error(`Brand user ${options.brand} not found. Run 'users' command first.`);
      }
      
      const campaigns = await seedCampaigns(brandUser._id);
      console.log(`${campaigns.length} campaigns seeded successfully`);
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('Campaign seeding failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('test-connection')
  .description('Test database connection')
  .action(async () => {
    try {
      console.log('Testing database connection...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB successfully');
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Found ${collections.length} collections:`);
      collections.forEach(col => console.log(`  - ${col.name}`));
      
      await mongoose.disconnect();
      console.log('Connection test completed');
      
    } catch (error) {
      console.error('Connection test failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear all data from database')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.force) {
        console.log('WARNING: This will permanently delete ALL data from the database.');
        console.log('Collections to be cleared:');
        console.log('  - users, brands, creators');
        console.log('  - campaigns, deals, payments');
        console.log('  - notifications, activitylogs');
        console.log('  - analytics, socialaccounts');
        console.log('  - conversations, messages');
        console.log('');
        console.log('Type "DELETE ALL DATA" to confirm:');
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('', resolve);
        });
        rl.close();
        
        if (answer !== 'DELETE ALL DATA') {
          console.log('Operation cancelled.');
          return;
        }
      }
      
      console.log('Clearing database...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      const db = mongoose.connection.db;
      
      const collections = [
        'users', 'brands', 'creators',
        'campaigns', 'deals', 'payments',
        'notifications', 'activitylogs',
        'analytics', 'socialaccounts',
        'conversations', 'messages',
        'admin', 'invoices', 'payouts',
        'referrals', 'reviews', 'ratings',
        'contracts', 'disputes', 'deliverables',
        'exportrequests', 'featuredlistings',
        'invitation', 'passwordhistories',
        'sessions', 'settings', 'subscriptions',
        'taxinfos', 'tokens', 'transactionlogs',
        'withdrawals', 'bankaccounts', 'creditcards',
        'auditlogs', 'consentlogs', 'fees',
        'performancepayments', 'refunds', 'reports',
        'savedsearches', 'tempotps'
      ];
      
      for (const collection of collections) {
        try {
          await db.collection(collection).dropMany({});
          console.log(`  Cleared: ${collection}`);
        } catch (error) {
          // Collection doesn't exist, skip
        }
      }
      
      await mongoose.disconnect();
      console.log('Database cleared successfully');
      
    } catch (error) {
      console.error('Clear operation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify seeded data integrity')
  .action(async () => {
    try {
      console.log('Verifying seeded data...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      
      const User = require('../models/User');
      const Brand = require('../models/Brand');
      const Creator = require('../models/Creator');
      const Campaign = require('../models/Campaign');
      const Deal = require('../models/Deal');
      const Payment = require('../models/Payment');
      
      const brandCount = await User.countDocuments({ userType: 'brand' });
      const creatorCount = await User.countDocuments({ userType: 'creator' });
      const campaignCount = await Campaign.countDocuments();
      const dealCount = await Deal.countDocuments();
      const paymentCount = await Payment.countDocuments();
      
      console.log('Data Verification Results:');
      console.log(`  Brands: ${brandCount}`);
      console.log(`  Creators: ${creatorCount}`);
      console.log(`  Campaigns: ${campaignCount}`);
      console.log(`  Deals: ${dealCount}`);
      console.log(`  Payments: ${paymentCount}`);
      
      // Check for data integrity
      const brandUser = await User.findOne({ userType: 'brand' });
      const creatorUser = await User.findOne({ userType: 'creator' });
      
      if (brandUser && creatorUser) {
        console.log('\nUser Verification:');
        console.log(`  Brand Email: ${brandUser.email}`);
        console.log(`  Creator Email: ${creatorUser.email}`);
        console.log(`  Brand Verified: ${brandUser.isVerified}`);
        console.log(`  Creator Verified: ${creatorUser.isVerified}`);
        
        const brandDetails = await Brand.findOne({ _id: brandUser._id });
        const creatorDetails = await Creator.findOne({ _id: creatorUser._id });
        
        if (brandDetails && creatorDetails) {
          console.log('\nProfile Verification:');
          console.log(`  Brand Name: ${brandDetails.brandName}`);
          console.log(`  Creator Handle: ${creatorDetails.handle}`);
          console.log(`  Creator Followers: ${creatorDetails.totalFollowers}`);
        }
      }
      
      await mongoose.disconnect();
      console.log('\nVerification completed');
      
    } catch (error) {
      console.error('Verification failed:', error.message);
      process.exit(1);
    }
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
