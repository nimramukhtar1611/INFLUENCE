const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Creator = require('../models/Creator');

const useTestDb = process.env.SEED_USE_TEST_DB === 'true' || process.env.NODE_ENV === 'test';
const mongoUri = useTestDb
  ? (process.env.MONGODB_TEST_URI || process.env.MONGODB_URI)
  : process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MongoDB URI. Set MONGODB_URI (and optionally MONGODB_TEST_URI).');
  process.exit(1);
}

const now = new Date();
const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

const flaggedCreatorPayload = {
  email: 'qa.creator.flagged@influencex.com',
  password: 'QaFlagged123',
  fullName: 'QA Creator Flagged',
  userType: 'creator',
  displayName: 'QA Creator Flagged',
  handle: 'qa_creator_flagged',
  niches: ['Tech', 'Lifestyle'],
  emailVerified: true,
  status: 'active',
  socialMedia: {
    instagram: {
      handle: 'qa_flagged_ig',
      followers: 210000,
      following: 460000,
      posts: 900,
      engagement: 0.22,
      verified: false,
      lastSynced: now
    },
    tiktok: {
      handle: 'qa_flagged_tt',
      followers: 980000,
      following: 1900,
      likes: 350000,
      videos: 1300,
      engagement: 0.31,
      verified: false,
      lastSynced: now
    },
    youtube: {
      handle: 'qa_flagged_yt',
      subscribers: 305000,
      views: 4500000,
      videos: 320,
      engagement: 0.41,
      verified: false,
      lastSynced: now
    }
  },
  socialVerification: {
    instagram: true,
    youtube: true,
    tiktok: true,
    twitter: false,
    facebook: false,
    linkedin: false
  },
  lastSocialSync: now,
  fraudDetection: {
    riskScore: 88,
    riskLevel: 'high',
    version: 'v1',
    manualReviewRequired: true,
    holdReason: 'QA seed: suspicious engagement and follow ratio',
    holdAppliedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: 'Seeded for admin moderation flow testing',
    lastEvaluatedAt: now,
    signals: [
      {
        type: 'low_engagement',
        platform: 'instagram',
        severity: 'high',
        weight: 35,
        value: 0.22,
        threshold: 0.7,
        reason: 'Seeded: extremely low engagement for follower size',
        detectedAt: now
      },
      {
        type: 'follow_ratio_anomaly',
        platform: 'instagram',
        severity: 'high',
        weight: 25,
        value: 2.19,
        threshold: 1.8,
        reason: 'Seeded: elevated following-to-follower ratio',
        detectedAt: now
      },
      {
        type: 'growth_engagement_divergence',
        platform: 'tiktok',
        severity: 'high',
        weight: 28,
        value: 96,
        threshold: 40,
        reason: 'Seeded: follower growth with engagement decline',
        detectedAt: now
      }
    ],
    history: [
      {
        platform: 'instagram',
        followers: 115000,
        following: 195000,
        engagement: 1.75,
        source: 'qa-seed',
        capturedAt: twoDaysAgo
      },
      {
        platform: 'tiktok',
        followers: 500000,
        following: 1200,
        engagement: 1.9,
        source: 'qa-seed',
        capturedAt: twoDaysAgo
      },
      {
        platform: 'youtube',
        followers: 260000,
        following: 0,
        engagement: 1.12,
        source: 'qa-seed',
        capturedAt: twoDaysAgo
      }
    ]
  }
};

async function upsertFlaggedCreator() {
  let creator = await Creator.findOne({ email: flaggedCreatorPayload.email });

  if (!creator) {
    creator = new Creator(flaggedCreatorPayload);
  } else {
    Object.assign(creator, flaggedCreatorPayload);
  }

  await creator.save();
  return creator;
}

async function run() {
  console.log('Seeding flagged QA creator for fraud moderation...');
  console.log(`Database: ${useTestDb ? 'TEST' : 'DEFAULT'} (${mongoUri})`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    const creator = await upsertFlaggedCreator();

    console.log('');
    console.log('Flagged creator seeded successfully.');
    console.log(`  email: ${flaggedCreatorPayload.email}`);
    console.log('  password: QaFlagged123');
    console.log(`  creatorId: ${creator._id}`);
    console.log(`  riskLevel: ${creator.fraudDetection?.riskLevel}`);
    console.log(`  riskScore: ${creator.fraudDetection?.riskScore}`);
    console.log(`  manualReviewRequired: ${creator.fraudDetection?.manualReviewRequired}`);
    console.log('');
    console.log('Admin Fraud Review queue should now include this account under Manual Review.');
  } catch (error) {
    console.error('Flagged creator seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
